import { apolloText } from "@/apollo/ApolloLocale";
import { missionsApi } from "@/api/missionsApi";
import { nasaApi } from "@/api/nasaApi";
import { el, loadingFeedback } from "@/core/dom";
import { MISSION_SLUGS } from "@/config/gameConfig";
import type { GameApp } from "@/core/GameApp";
import type { Screen } from "@/screens/Screen";
import type { MissionDTO } from "@/types";
import type { NasaMissionBriefing } from "@/types";
import { getLanguage, t } from "@/core/i18n";
import {missionSelectText as copy} from "./MissionSelectCopy";

const STATUS_LABEL: Record<MissionDTO["status"], string> = {
  locked: "Bloqueada",
  unlocked: "Disponible",
  in_progress: "En progreso",
  completed: "Completada",
};

/** Formats an RSS (RFC 822) or ISO date string into a readable Spanish date. */
function formatStoryDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const locale = { es: "es-ES", en: "en-US", fr: "fr-FR" }[getLanguage()];
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(parsed);
}

/** Mission carousel: shows the 3 missions with lock state and progress. */
export class MissionSelectScreen implements Screen {
  private nasaCarouselTimer: number | undefined;
  private disposed=false;
  private requestId=0;
  private opening=false;
  constructor(private app: GameApp) {}

  async mount(container: HTMLElement): Promise<void> {
    this.disposed=false;
    const panel=el("section",{className:"screen mission-select-screen"});
    const header=el("header",{className:"mission-select-header"});
    const identity=el("div",{className:"mission-select-identity"});
    identity.append(el("small",{className:"mission-select-kicker",text:"GUATEC · "+copy("Operaciones de misión")}),el("h2",{className:"screen-title",text:copy("Centro de misiones")}),el("p",{className:"mission-select-user",text:`${t("Comandante")} ${this.app.currentUser?.username??""}`}));
    const actions=el("div",{className:"mission-select-actions"});
    const logout=el("button",{className:"btn btn-ghost",text:t("Cerrar sesión"),attrs:{type:"button"}});
    logout.addEventListener("click",()=>{if(!this.opening)this.app.logout()});actions.append(logout);header.append(identity,actions);
    const carousel=el("div",{className:"mission-carousel",attrs:{id:"mission-carousel"}});
    const feedback=el("div",{className:"mission-select-feedback",attrs:{"aria-live":"polite"}});
    panel.append(header,feedback,carousel);container.append(panel);
    const load=async()=>{
      const request=++this.requestId;
      feedback.replaceChildren(loadingFeedback(t("Cargando...")));carousel.replaceChildren();
      try{
        const response=await missionsApi.list();if(this.disposed||request!==this.requestId)return;
        feedback.replaceChildren();
        const primary=response.missions.find(mission=>mission.slug===MISSION_SLUGS.mission1);
        if(primary)carousel.append(this.renderMission(primary,feedback));
        const future=response.missions.filter(mission=>mission.slug!==MISSION_SLUGS.mission1).sort((a,b)=>a.order-b.order);
        if(future.length){const group=el("section",{className:"mission-future-group"});group.append(el("h3",{className:"mission-future-heading",text:copy("Misiones futuras")}));const list=el("div",{className:"mission-future-list"});for(const mission of future)list.append(this.renderMission(mission,feedback));group.append(list);carousel.append(group)}
        if(!response.missions.length)showFailure(copy("No hay misiones disponibles."));
      }catch{if(!this.disposed&&request===this.requestId)showFailure(t("No se pudo conectar con el servidor."));}
    };
    const showFailure=(message:string)=>{
      feedback.replaceChildren();const error=el("div",{className:"mission-select-error",attrs:{role:"alert"}});
      const retry=el("button",{className:"mission-retry",text:copy("Reintentar"),attrs:{type:"button"}});retry.addEventListener("click",()=>void load());error.append(el("p",{text:message}),retry);feedback.append(error);
    };
    // NASA content is independent: its request cannot delay mission selection.
    void nasaApi.missionBriefing().then(briefing=>{if(!this.disposed&&panel.isConnected)this.renderNasaBriefing(panel,briefing)}).catch(()=>{});
    await load();
  }

  private renderMission(mission:MissionDTO,feedback:HTMLElement):HTMLElement {
    const primary=mission.slug===MISSION_SLUGS.mission1,playable=primary&&mission.status!=="locked";
    const card=el("article",{className:`mission-card ${primary?"mission-card--featured":"mission-card--future"}${playable?"":" mission-card--locked"}`});
    card.dataset.mission=mission.slug;card.dataset.status=mission.status;
    if(primary){
      const image=el("img",{className:"mission-card-preview",attrs:{src:"/assets/apollo/kennedy-operations.png",alt:copy("Vista del escenario de Apollo 11 en Kennedy"),decoding:"async"}});card.append(image,el("span",{className:"mission-card-image-label",text:copy("Escenario de la misión")}));
    }
    const content=el("div",{className:"mission-card-content"});
    content.append(el("small",{className:"mission-card-kicker",text:primary?"KENNEDY SPACE CENTER · 1969":copy("Contenido en preparación")}),el("h3",{className:"mission-card-title",text:primary?apolloText("Misión 01: Apollo 11"):t(mission.title)}));
    if(primary){
      content.append(el("p",{className:"mission-card-subtitle",text:apolloText("El comienzo de una nueva era · 16 de julio de 1969")}),el("p",{className:"mission-card-description",text:apolloText("Kennedy Space Center. Completa operaciones de apoyo, observa el traslado de la tripulación y presencia el lanzamiento del Saturn V.")}));
      const percent=Number.isFinite(mission.progressPercent)?Math.max(0,Math.min(100,Math.round(mission.progressPercent))):0;
      const progress=el("div",{className:"mission-progress"});
      const row=el("div",{className:"mission-progress-heading"});row.append(el("span",{className:"mission-card-status",text:t(STATUS_LABEL[mission.status])}),el("span",{className:"mission-progress-value",text:percent+"%"}));
      const bar=el("div",{className:"progress-bar",attrs:{role:"progressbar","aria-label":copy("Progreso de misión"),"aria-valuemin":"0","aria-valuemax":"100","aria-valuenow":String(percent)}}),fill=el("div",{className:"progress-bar-fill"});fill.style.width=percent+"%";bar.append(fill);progress.append(row,bar);content.append(progress);
      if(playable){
        const cta=el("span",{className:"mission-card-cta",text:copy(mission.status==="completed"?"Revisar misión":mission.status==="in_progress"?"Continuar misión":"Comenzar misión")+"  ↗"});content.append(cta);
        card.tabIndex=0;card.setAttribute("role","button");card.setAttribute("aria-label",apolloText("Misión 01: Apollo 11"));
        const open=async()=>{
          if(this.opening||this.disposed)return;this.opening=true;card.setAttribute("aria-busy","true");cta.textContent=copy("Abriendo misión…");
          try{await this.app.showMission1()}catch{if(!this.disposed){feedback.replaceChildren(el("p",{className:"form-error",text:copy("No se pudo abrir la misión. Intenta de nuevo."),attrs:{role:"alert"}}));cta.textContent=copy(mission.status==="completed"?"Revisar misión":mission.status==="in_progress"?"Continuar misión":"Comenzar misión")+"  ↗";card.removeAttribute("aria-busy")}}finally{this.opening=false}
        };
        card.addEventListener("click",()=>void open());card.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();if(!event.repeat)void open()}});
      }
    }else{
      content.append(el("p",{className:"mission-card-description",text:t("Disponible próximamente en esta demo.")}),el("span",{className:"mission-card-status",text:t("Próximamente")}));
      const lock=el("span",{className:"mission-future-lock",text:"Ⅱ",attrs:{"aria-hidden":"true"}});card.append(lock);
    }
    card.append(content);return card;
  }

  private renderNasaBriefing(panel: HTMLElement, briefing: NasaMissionBriefing): void {
    const stories = briefing.stories.length > 0
      ? briefing.stories
      : briefing.apod.title || briefing.apod.explanation || briefing.apod.imageUrl
        ? [{
          kind: "APOD",
          title: briefing.apod.title,
          summary: briefing.apod.explanation,
          date: briefing.apod.date,
          imageUrl: briefing.apod.imageUrl,
          sourceUrl: briefing.apod.url,
        }]
        : [];
    if (stories.length === 0) return;
    const card = el("section", { className: "nasa-briefing nasa-carousel" });
    const viewport = el("div", {
      className: "nasa-carousel-viewport",
      attrs: { role: "group", "aria-label": t("Carrusel de reportes NASA"), tabindex: "0" },
    });
    const track = el("div", { className: "nasa-carousel-track" });
    const dots = el("div", { className: "nasa-carousel-dots" });
    let activeIndex = 0;

    const renderSlide = (index: number) => {
      activeIndex = (index + stories.length) % stories.length;
      track.innerHTML = "";
      const story = stories[activeIndex];
      const sourceTitle = story.title ? t(story.title) : "";
      const titleText = sourceTitle && (sourceTitle !== story.title || getLanguage() === "en")
        ? sourceTitle
        : t("Actualización de NASA");
      const sourceSummary = story.summary ? t(story.summary) : "";
      const summaryText = sourceSummary && (sourceSummary !== story.summary || getLanguage() === "en")
        ? sourceSummary
        : t("Abre la fuente de NASA para consultar los detalles.");
      const images = story.images && story.images.length > 0
        ? story.images
        : story.imageUrl
          ? [story.imageUrl]
          : [];
      track.classList.toggle("nasa-carousel-track--text-only", images.length === 0);

      if (images.length > 0) {
        const media = el("div", { className: "nasa-briefing-media" });
        const mainImg = el("img", {
          className: "nasa-briefing-image",
          attrs: { src: images[0], alt: titleText || t("Imagen NASA"), loading: "lazy" },
        }) as HTMLImageElement;
        media.append(story.sourceUrl
          ? el("a", { attrs: { href: story.sourceUrl, target: "_blank", rel: "noreferrer" }, children: [mainImg] })
          : mainImg);

        if (images.length > 1) {
          const gallery = el("div", { className: "nasa-briefing-gallery" });
          images.forEach((src, thumbIndex) => {
            const thumb = el("img", {
              className: `nasa-briefing-thumb${thumbIndex === 0 ? " active" : ""}`,
              attrs: { src, alt: `Imagen relacionada ${thumbIndex + 1}`, loading: "lazy" },
            }) as HTMLImageElement;
            thumb.addEventListener("click", () => {
              mainImg.src = src;
              gallery.querySelectorAll(".nasa-briefing-thumb").forEach((node) => node.classList.remove("active"));
              thumb.classList.add("active");
            });
            gallery.append(thumb);
          });
          media.append(gallery);
        }
        track.append(media);
      }

      const copy = el("div", { className: "nasa-briefing-copy" });
      copy.append(
        el("p", { className: "nasa-kicker", text: `${t(story.kind)} · ${t("DATOS NASA EN TIEMPO REAL")}` }),
        story.sourceUrl
          ? el("h3", { className: "nasa-briefing-title", children: [
            el("a", {
              className: "nasa-briefing-title-link",
              text: titleText,
              attrs: { href: story.sourceUrl, target: "_blank", rel: "noreferrer" },
            }),
          ] })
          : el("h3", { className: "nasa-briefing-title", text: titleText }),
      );
      const dateLabel = formatStoryDate(story.date);
      if (dateLabel) {
        copy.append(el("p", { className: "nasa-briefing-date", text: `🗓️ ${t('Publicado el')} ${dateLabel}` }));
      }
      copy.append(
        el("p", { className: "nasa-briefing-description", text: summaryText || t("Abre la fuente de NASA para consultar los detalles.") }),
      );
      if (story.sourceUrl) {
        copy.append(el("a", {
          className: "nasa-story-link",
          text: t("Abrir investigación ↗"),
          attrs: { href: story.sourceUrl, target: "_blank", rel: "noreferrer" },
        }));
      }
      track.append(copy);
      dots.querySelectorAll("button").forEach((dot, dotIndex) => {
        dot.classList.toggle("active", dotIndex === activeIndex);
      });
    };

    const previous = el("button", { className: "nasa-carousel-control", text: "‹", attrs: { type: "button", "aria-label": t("Historia anterior") } });
    const next = el("button", { className: "nasa-carousel-control", text: "›", attrs: { type: "button", "aria-label": t("Siguiente historia") } });
    previous.addEventListener("click", () => renderSlide(activeIndex - 1));
    next.addEventListener("click", () => renderSlide(activeIndex + 1));
    let swipeStart: { x: number; y: number } | null = null;
    viewport.addEventListener("pointerdown", (event) => {
      swipeStart = { x: event.clientX, y: event.clientY };
    });
    viewport.addEventListener("pointerup", (event) => {
      if (!swipeStart) return;
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      renderSlide(activeIndex + (dx < 0 ? 1 : -1));
    });
    viewport.addEventListener("pointercancel", () => { swipeStart = null; });
    viewport.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") renderSlide(activeIndex - 1);
      if (event.key === "ArrowRight") renderSlide(activeIndex + 1);
    });
    stories.forEach((_, index) => {
      const dot = el("button", { className: "nasa-carousel-dot", text: "", attrs: { type: "button", "aria-label": `${t('Historia')} ${index + 1}` } });
      dot.addEventListener("click", () => renderSlide(index));
      dots.append(dot);
    });
    viewport.append(previous, track, next);
    card.append(
      el("div", { className: "nasa-carousel-heading", }, ),
      viewport,
      dots,
    );
    card.querySelector(".nasa-carousel-heading")!.append(
      el("p", { className: "nasa-kicker", text: t("CENTRO DE INTELIGENCIA · NASA") }),
      el("span", { className: "nasa-carousel-counter", text: `${stories.length} ${t("reportes disponibles")}` }),
    );
    renderSlide(0);
    this.nasaCarouselTimer = window.setInterval(() => renderSlide(activeIndex + 1), 9000);
    panel.append(card);
  }

  unmount(): void {
    this.disposed=true;this.requestId++;
    if (this.nasaCarouselTimer !== undefined) window.clearInterval(this.nasaCarouselTimer);
    this.nasaCarouselTimer=undefined;
  }
}
