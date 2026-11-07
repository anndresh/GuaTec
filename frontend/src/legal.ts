import "bootstrap/dist/css/bootstrap.min.css";
import "./legal.css";
import {getLanguage,setLanguage,type Language} from "./core/language";

type DocumentId = "privacy" | "terms" | "contact";

interface Section {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface LegalDocument {
  title: string;
  lastUpdated?: string;
  introduction: string;
  sections: Section[];
}

interface TeamMember {
  name: string;
  email?: string;
  instagramUrl?: string;
  instagramHandle?: string;
  linkedinUrl: string;
}

interface LegalCopy {
  project: string;
  lastUpdated: string;
  languageLabel: string;
  languages: Record<Language, string>;
  documents: Record<DocumentId, string>;
  projectDisclaimer: string;
  backToProject: string;
  roleLabel: string;
  emailLabel: string;
  instagramLabel: string;
  pendingLabel: string;
  contactLinksLabel: string;
  footer: string;
  pages: Record<DocumentId, LegalDocument>;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Andrés Sánchez Pérez",
    email: "anndreesh@icloud.com",
    instagramUrl: "https://www.instagram.com/anndreesh_/",
    instagramHandle: "@anndreesh_",
    linkedinUrl: "https://www.linkedin.com/in/anndreesh/",
  },
];
const LANGUAGES: Language[] = ["es", "en", "fr"];
const DOCUMENTS: DocumentId[] = ["privacy", "terms", "contact"];

const copy: Record<Language, LegalCopy> = {
  es: {
    project: "GuaTec",
    lastUpdated: "Última actualización: 8 de octubre de 2026",
    languageLabel: "Idioma",
    languages: { es: "Español", en: "English", fr: "Français" },
    documents: {
      privacy: "Privacidad",
      terms: "Términos de uso",
      contact: "Contacto",
    },
    projectDisclaimer:
      "GuaTec es un proyecto independiente, educativo y de simulación. No es un producto oficial de la NASA ni está afiliado, patrocinado o avalado por la NASA.",
    backToProject: "Volver a GuaTec",
    roleLabel: "Rol",
    emailLabel: "Correo electrónico",
    instagramLabel: "Instagram",
    pendingLabel: "Pendiente",
    contactLinksLabel: "Canales de contacto",
    footer:
      "La documentación describe las funciones disponibles en GuaTec a la fecha de actualización.",
    pages: {
      privacy: {
        title: "Política de privacidad",
        lastUpdated: "Última actualización: 7 de noviembre de 2026",
        introduction:
          "Esta política describe los datos tratados al usar GuaTec, incluido el acceso de Invitado y el guardado de Apollo 11, sus finalidades y las opciones para consultar o eliminar tu información.",
        sections: [
          {
            title: "1. Datos que se procesan",
            paragraphs: [
              "Según el método de acceso disponible que elijas, se trata tu correo electrónico y una contraseña almacenada como hash, o el correo, identificador del proveedor y URL de la imagen de perfil recibidos de Google o GitHub. También se guardan el identificador interno de la cuenta, tu nombre de usuario y las fechas de creación y actualización. Invitado crea un perfil seudónimo en el servidor sin exigirte correo ni contraseña; no significa que la actividad carezca de un identificador.",
              "El progreso se vincula a tu perfil. En Apollo 11 incluye el estado de la misión, operaciones y comprobaciones completadas, tiempo de juego, borradores y respuestas de los instrumentos, informes y fechas de guardado. Otras funciones de la simulación pueden conservar decisiones, recursos, inventario, muestras y estadísticas cuando se utilizan. No incluyas información personal o sensible en respuestas ni borradores.",
              "El navegador conserva el idioma, el nombre de usuario en caché, un token de acceso de duración limitada y, durante el alta con Google o GitHub, el correo pendiente. Apollo 11 guarda además una copia local del progreso y los borradores asociada al identificador de tu perfil, que intenta sincronizar con el servidor. Puede haber preferencias de calidad gráfica y una selección de fondo durante la sesión. Los servicios de alojamiento pueden tratar datos técnicos de conexión y registros de solicitudes o errores.",
            ],
          },
          {
            title: "2. Finalidades y fundamento",
            paragraphs: [
              "Los datos se utilizan para crear y proteger cuentas, iniciar sesión, verificar la identidad, guardar y recuperar el progreso, mostrar informes y estadísticas, prevenir abusos y mantener el servicio. Las bases jurídicas se aplican según el país: prestación de la función que solicitas, consentimiento cuando corresponda e intereses legítimos de seguridad y mantenimiento, sin prevalecer sobre tus derechos.",
              "No se venden datos personales ni el código de GuaTec implementa publicidad personalizada. No introduzcas en nombres de usuario, correo u otros campos datos sensibles o información de otras personas.",
            ],
          },
          {
            title: "3. Proveedores y transferencias",
            paragraphs: [
              "El sitio se sirve desde Vercel y la API del despliegue actual se aloja en Render. Las cuentas y los avances se almacenan en la base de datos asociada al servicio de API. Google o GitHub intervienen cuando eliges un acceso disponible con esos proveedores. La API puede consultar servicios públicos de NASA para obtener material espacial sin necesitar tu contraseña ni tu progreso. Al abrir enlaces externos, como LinkedIn, Instagram o recursos educativos, accedes a servicios con sus propias políticas de privacidad.",
              "Estos proveedores pueden tratar información en los países donde operan sus centros de datos. Consulta sus políticas y configuraciones para conocer sus ubicaciones, condiciones de transferencia y plazos de conservación.",
            ],
          },
          {
            title: "4. Almacenamiento y conservación",
            paragraphs: [
              "El token, las preferencias y la copia local de Apollo 11 se guardan en el almacenamiento del navegador. Cerrar sesión elimina el token, pero no borra automáticamente las preferencias, las copias locales ni el progreso del servidor. Puedes borrar los datos del sitio desde el navegador; esto elimina las copias locales de ese navegador, pero no los registros del servidor. El acceso con Google o GitHub puede utilizar una cookie técnica de sesión para verificar el proceso de autenticación; no es una cookie de publicidad.",
              "Los registros y avances se conservan mientras la cuenta siga activa o sean necesarios para prestar el servicio, y cuando deban mantenerse por seguridad u obligaciones legales. La configuración y las políticas de los proveedores determinan la conservación de sus registros técnicos y copias de respaldo. No hay eliminación automática de la cuenta por cerrar sesión. Si usas Invitado, perder el token o borrar los datos del navegador puede impedir recuperar el acceso; conserva la sesión mientras solicitas ayuda.",
            ],
          },
          {
            title: "5. Tus derechos y consultas",
            paragraphs: [
              "Según la legislación aplicable, puedes solicitar acceso, corrección, eliminación, portabilidad o limitación del tratamiento, oponerte al tratamiento y retirar un consentimiento cuando corresponda. También puedes acudir a la autoridad de protección de datos competente. El contacto de privacidad de GuaTec es Andrés Sánchez Pérez: anndreesh@icloud.com. Encontrarás sus canales en la pestaña Contacto.",
              "Para solicitar acceso, corrección o eliminación, escribe a ese correo indicando tu nombre de usuario y la petición. Si tu cuenta tiene un correo asociado, úsalo para contactar. Si eres Invitado, indica que tu perfil no tiene correo; se acordará una comprobación proporcional de la titularidad antes de modificar o entregar datos. No envíes contraseñas ni tokens. El borrado en el servidor no elimina las copias locales de tus dispositivos; borra también los datos del sitio en cada navegador.",
            ],
          },
          {
            title: "6. Menores y cambios",
            paragraphs: [
              "GuaTec es educativo; no solicita deliberadamente información sensible ni está diseñado para que se publiquen datos personales. Si eres menor, utiliza GuaTec con el acompañamiento de una persona adulta cuando así lo exija tu legislación. Si una persona responsable cree que se proporcionaron datos de un menor de forma inadecuada, puede pedir su revisión o eliminación.",
              "Esta política puede actualizarse cuando cambien el código, los proveedores o las obligaciones legales. La fecha de actualización que figura arriba identifica la versión publicada.",
            ],
          },
        ],
      },
      terms: {
        title: "Términos y condiciones de uso",
        lastUpdated: "Última actualización: 7 de noviembre de 2026",
        introduction:
          "Al acceder a GuaTec aceptas estas condiciones. Si no estás de acuerdo, no crees una cuenta ni continúes usando el servicio.",
        sections: [
          {
            title: "1. GuaTec",
            paragraphs: [
              "GuaTec es una experiencia educativa y de simulación de exploración espacial. Sus escenas, decisiones, cronología, resultados y sistemas son representaciones narrativas o mecánicas; no constituyen datos científicos, predicciones ni instrucciones profesionales. Las referencias históricas y los recursos de terceros conservan sus respectivas autorías y condiciones de uso.",
              "GuaTec es independiente y no está afiliado, patrocinado ni avalado por la NASA. Los nombres y referencias de NASA identifican fuentes o temas relacionados, no una asociación institucional.",
              "La misión jugable disponible es Apollo 11, ambientada en el Centro Espacial Kennedy el 16 de julio de 1969, con quince operaciones de apoyo terrestre. El jugador interpreta a un técnico ficticio; las actividades e instrumentos son simplificaciones educativas. Las misiones 02 y 03 aparecen como contenido futuro y todavía no son jugables.",
            ],
          },
          {
            title: "2. Cuentas y uso aceptable",
            paragraphs: [
              "Debes proporcionar datos de acceso correctos, mantener tu contraseña en privado y avisar si sospechas un acceso no autorizado. Eres responsable de la actividad realizada en tu cuenta mientras tengas control de ella.",
              "Puedes utilizar el modo Invitado con un nombre de usuario o los métodos de acceso que estén disponibles. El progreso se vincula al perfil utilizado. Conserva el acceso a ese perfil: cerrar sesión o borrar los datos del navegador puede impedir recuperar una sesión de Invitado si no dispones de otro método de acceso. No compartas contraseñas ni tokens de sesión.",
            ],
            bullets: [
              "Utiliza GuaTec de forma legal y no intentes acceder a cuentas, datos o sistemas sin autorización.",
              "No interfieras con el servicio, no introduzcas código dañino ni eludas controles de seguridad.",
              "No uses nombres de usuario o perfiles para suplantar, acosar o divulgar datos personales propios o ajenos.",
              "No presentes decisiones o simulaciones como instrucciones reales para construir, lanzar u operar equipos.",
            ],
          },
          {
            title: "3. Propiedad intelectual y servicios externos",
            paragraphs: [
              "El código, la identidad visual y los materiales originales de GuaTec corresponden a sus titulares y se ofrecen conforme a las licencias aplicables. Los recursos de NASA, Poly Haven, proveedores de acceso y otros terceros siguen sujetos a sus propios derechos y términos; su mención no transfiere propiedad ni implica respaldo.",
              "El sitio se publica en Vercel y la API del despliegue actual se sirve mediante Render. Los métodos de acceso mediante Google o GitHub, cuando están disponibles, y los servicios de alojamiento y base de datos dependen de proveedores externos. Su disponibilidad y tratamiento también se rigen por las condiciones y políticas de esos proveedores. Las noticias de NASA y las vistas de recursos externos pueden cambiar o no estar disponibles sin que ello implique un cambio en las misiones.",
            ],
          },
          {
            title: "4. Disponibilidad, cambios y responsabilidad",
            paragraphs: [
              "GuaTec se proporciona en su estado actual y puede modificarse, interrumpirse o dejar de estar disponible, con o sin aviso, según lo permita la ley. Aunque se intenta proteger el progreso guardado, no se garantiza que los datos estén siempre disponibles ni que no ocurran interrupciones o pérdidas.",
              "En la máxima medida permitida por la ley, quienes mantienen GuaTec no responden por daños indirectos derivados del uso o la indisponibilidad de la simulación, ni por decisiones basadas en su contenido. Nada de estos términos excluye derechos o responsabilidades que legalmente no puedan excluirse.",
            ],
          },
          {
            title: "5. Suspensión, privacidad y cambios en los términos",
            paragraphs: [
              "El acceso puede suspenderse si se incumplen estas condiciones, existe riesgo para el servicio o así lo exige la ley. El tratamiento de datos se describe en la Política de privacidad disponible en esta página.",
              "Las condiciones pueden cambiar para reflejar mejoras, funciones nuevas u obligaciones legales. Si el cambio es sustancial, se indicará una fecha de revisión actualizada. El uso posterior a la publicación de los nuevos términos implica su aceptación en la medida permitida por la legislación aplicable.",
            ],
          },
          {
            title: "6. Legislación y contacto",
            paragraphs: [
              "Se aplicarán los derechos imperativos y las normas de protección al consumidor de tu lugar de residencia cuando correspondan. Las cuestiones relacionadas con estas condiciones pueden comunicarse por los canales indicados a continuación.",
            ],
          },
        ],
      },
      contact: {
        title: "Contacto",
        introduction:
          "¿Tienes una pregunta sobre GuaTec, una cuenta, tus datos personales o estas condiciones? Consulta los canales de contacto del equipo.",
        sections: [
          {
            title: "Privacidad y cuentas",
            paragraphs: [
              "Para solicitar acceso, corrección o eliminación de datos, incluye el correo asociado a la cuenta y, si corresponde, el nombre de usuario. No envíes contraseñas ni tokens de sesión. Puede ser necesario verificar la titularidad antes de atender la solicitud.",
            ],
          },
          {
            title: "Comentarios sobre GuaTec",
            paragraphs: [
              "También puedes escribirnos si detectas un problema de accesibilidad, una atribución incorrecta o un error en el contenido educativo. Describe la pantalla o el tema afectado sin compartir información sensible.",
            ],
          },
        ],
      },
    },
  },
  en: {
    project: "GuaTec",
    lastUpdated: "Last updated: October 8, 2026",
    languageLabel: "Language",
    languages: { es: "Español", en: "English", fr: "Français" },
    documents: {
      privacy: "Privacy policy",
      terms: "Terms of use",
      contact: "Contact",
    },
    projectDisclaimer:
      "GuaTec is an independent educational simulation. It is not an official NASA product and is not affiliated with, sponsored by, or endorsed by NASA.",
    backToProject: "Back to GuaTec",
    roleLabel: "Role",
    emailLabel: "Email",
    instagramLabel: "Instagram",
    pendingLabel: "Pending",
    contactLinksLabel: "Contact channels",
    footer:
      "This documentation describes the features available in GuaTec as of the update date.",
    pages: {
      privacy: {
        title: "Privacy policy",
        lastUpdated: "Last updated: November 7, 2026",
        introduction:
          "This policy describes the data processed when using GuaTec, including Guest access and Apollo 11 saves, why it is used, and how to request access to or deletion of your information.",
        sections: [
          {
            title: "1. Data we process",
            paragraphs: [
              "Depending on the available sign-in method you choose, we process your email address and a password stored as a hash, or the email address, provider identifier and profile image URL received from Google or GitHub. We also store your internal account identifier, username, and creation and update dates. Guest access creates a pseudonymous server profile without requiring an email or password; it does not mean your activity has no identifier.",
              "Progress is linked to your profile. In Apollo 11 it includes mission state, completed operations and checks, play time, instrument drafts and answers, reports and save timestamps. Other simulation features may store decisions, resources, inventory, samples and statistics when used. Do not enter personal or sensitive information in answers or drafts.",
              "Your browser stores the language, a cached username, a time-limited access token and, during Google or GitHub sign-up, the pending email address. Apollo 11 also stores a local copy of progress and drafts linked to your profile identifier and attempts to synchronize it with the server. Graphics quality preferences and a background selection for the session may also be stored. Hosting services may process technical connection data and request or error logs.",
            ],
          },
          {
            title: "2. Purposes and legal grounds",
            paragraphs: [
              "Data is used to create and secure accounts, sign in, verify identity, save and restore progress, display reports and statistics, prevent abuse, and maintain the service. Legal grounds depend on your country and may include providing the feature you request, consent where applicable, and legitimate interests in security and maintenance, balanced against your rights.",
              "Personal data is not sold, and GuaTec's code does not implement personalized advertising. Do not enter sensitive information or another person's information in usernames, email fields or other fields.",
            ],
          },
          {
            title: "3. Providers and transfers",
            paragraphs: [
              "Vercel serves the site, and Render hosts the API for the current deployment. Accounts and progress are stored in the database associated with the API service. Google or GitHub are involved when you choose an available sign-in method with those providers. The API may request public NASA services for space-related material without needing your password or progress. Opening external links, such as LinkedIn, Instagram or educational resources, takes you to services with their own privacy policies.",
              "These providers may process information in the countries where their data centers operate. Consult their policies and configuration to learn their locations, transfer terms and retention periods.",
            ],
          },
          {
            title: "4. Storage and retention",
            paragraphs: [
              "The token, preferences and local Apollo 11 copy are saved in browser storage. Signing out removes the token but does not automatically delete preferences, local copies or server progress. You can clear site data in your browser; this removes local copies in that browser but does not delete server records. Google or GitHub sign-in may use a technical session cookie to verify the authentication flow; it is not an advertising cookie.",
              "Records and progress are retained while your account is active or needed to provide the service, and where required for security or legal obligations. Provider settings and policies determine retention of their technical logs and backups. Signing out does not automatically delete your account. If you use Guest access, losing the token or clearing browser data may prevent you from recovering access; keep your session while requesting help.",
            ],
          },
          {
            title: "5. Your rights and questions",
            paragraphs: [
              "Depending on applicable law, you may request access, correction, deletion, portability or restriction of processing, object to processing, or withdraw consent where applicable. You may also contact the competent data protection authority. The GuaTec privacy contact is Andrés Sánchez Pérez: anndreesh@icloud.com. His channels are listed in the Contact tab.",
              "To request access, correction or deletion, email that address with your username and request. If your account has a linked email address, use it to contact us. If you are a Guest, state that your profile has no email; an appropriate ownership check will be arranged before changing or disclosing data. Do not send passwords or tokens. Server deletion does not remove local copies on your devices; also clear site data in each browser.",
            ],
          },
          {
            title: "6. Children and changes",
            paragraphs: [
              "GuaTec is educational; it does not deliberately request sensitive information or provide a space for publishing personal details. If you are a minor, use GuaTec with adult supervision when required by your local law. A parent or guardian who believes a minor's information was provided inappropriately may request its review or deletion.",
              "This policy may change when the code, providers or legal requirements change. The update date above identifies the published version.",
            ],
          },
        ],
      },
      terms: {
        title: "Terms and conditions of use",
        lastUpdated: "Last updated: November 7, 2026",
        introduction:
          "By accessing GuaTec, you agree to these terms. If you do not agree, do not create an account or continue using the service.",
        sections: [
          {
            title: "1. GuaTec",
            paragraphs: [
              "GuaTec is an educational space-exploration simulation. Its scenes, decisions, timeline, results and systems are narrative representations or simulation systems; they are not scientific data, predictions or professional instructions. Historical references and third-party resources remain subject to their respective attribution and terms.",
              "GuaTec is independent and is not affiliated with, sponsored by, or endorsed by NASA. NASA names and references identify sources or related subject matter, not an institutional partnership.",
              "The available playable mission is Apollo 11, set at Kennedy Space Center on July 16, 1969, with fifteen ground-support operations. The player portrays a fictional technician; activities and instruments are educational simplifications. Missions 02 and 03 are shown as future content and are not yet playable.",
            ],
          },
          {
            title: "2. Accounts and acceptable use",
            paragraphs: [
              "Provide accurate sign-in information, keep your password private and report suspected unauthorized access. You are responsible for activity on your account while it is under your control.",
              "You can use Guest mode with a username or the sign-in methods that are available. Progress is linked to the profile you use. Retain access to that profile: signing out or clearing browser data may prevent recovery of a Guest session if you have no other sign-in method. Do not share passwords or session tokens.",
            ],
            bullets: [
              "Use GuaTec lawfully and do not attempt to access accounts, data or systems without authorization.",
              "Do not interfere with the service, introduce malicious code or bypass security controls.",
              "Do not use usernames or profiles to impersonate, harass or disclose personal information about yourself or others.",
              "Do not present simulations or decisions as real-world instructions for building, launching or operating equipment.",
            ],
          },
          {
            title: "3. Intellectual property and third-party services",
            paragraphs: [
              "GuaTec's code, visual identity and original materials belong to their respective rights holders and are provided subject to applicable licenses. NASA, Poly Haven, sign-in provider and other third-party resources remain subject to their own rights and terms; mentioning them does not transfer ownership or imply endorsement.",
              "The site is published on Vercel, and the API for the current deployment is served through Render. Google or GitHub sign-in methods, when available, and hosting and database services depend on external providers. Their availability and data processing are also governed by those providers’ terms and policies. NASA news and external resource viewers may change or become unavailable without implying a change to the missions.",
            ],
          },
          {
            title: "4. Availability, changes and liability",
            paragraphs: [
              "GuaTec is provided as it currently exists and may be modified, interrupted or discontinued, with or without notice, as permitted by law. While we try to protect saved progress, we do not guarantee that data will always be available or that interruptions or loss will not occur.",
              "To the maximum extent permitted by law, the people maintaining GuaTec are not liable for indirect damages arising from use or unavailability of the simulation or decisions based on its content. Nothing in these terms excludes rights or liabilities that cannot legally be excluded.",
            ],
          },
          {
            title: "5. Suspension, privacy and changes to these terms",
            paragraphs: [
              "Access may be suspended if these terms are violated, the service is at risk, or the law requires it. Data processing is described in the Privacy Policy available on this page.",
              "These terms may change to reflect improvements, new features or legal requirements. Substantial changes will be indicated by an updated review date. Continued use after publication of new terms constitutes acceptance to the extent permitted by applicable law.",
            ],
          },
          {
            title: "6. Law and contact",
            paragraphs: [
              "Mandatory legal protections and consumer rights in your place of residence apply where relevant. Questions about these terms can be sent using the contact channels below.",
            ],
          },
        ],
      },
      contact: {
        title: "Contact",
        introduction:
          "Have a question about GuaTec, an account, your personal data or these terms? See the GuaTec team's contact channels.",
        sections: [
          {
            title: "Privacy and accounts",
            paragraphs: [
              "To request access to, correction or deletion of data, include the email address associated with your account and, where applicable, your username. Do not send passwords or session tokens. We may need to verify account ownership before processing a request.",
            ],
          },
          {
            title: "GuaTec feedback",
            paragraphs: [
              "You can also report an accessibility issue, incorrect attribution or an error in educational content. Describe the affected screen or topic without sharing sensitive information.",
            ],
          },
        ],
      },
    },
  },
  fr: {
    project: "GuaTec",
    lastUpdated: "Dernière mise à jour : 8 octobre 2026",
    languageLabel: "Langue",
    languages: { es: "Español", en: "English", fr: "Français" },
    documents: {
      privacy: "Confidentialité",
      terms: "Conditions d’utilisation",
      contact: "Contact",
    },
    projectDisclaimer:
      "GuaTec est une simulation éducative indépendante. Ce n'est pas un produit officiel de la NASA et GuaTec n'est ni affilié, ni financé, ni approuvé par la NASA.",
    backToProject: "Retour à GuaTec",
    roleLabel: "Rôle",
    emailLabel: "E-mail",
    instagramLabel: "Instagram",
    pendingLabel: "À renseigner",
    contactLinksLabel: "Moyens de contact",
    footer:
      "Cette documentation décrit les fonctionnalités de GuaTec à la date de mise à jour.",
    pages: {
      privacy: {
        title: "Politique de confidentialité",
        lastUpdated: "Dernière mise à jour : 7 novembre 2026",
        introduction:
          "Cette politique décrit les données traitées lors de l’utilisation de GuaTec, y compris l’accès Invité et les sauvegardes d’Apollo 11, leurs finalités et les moyens de demander l’accès à vos informations ou leur suppression.",
        sections: [
          {
            title: "1. Données traitées",
            paragraphs: [
              "Selon le mode de connexion disponible choisi, nous traitons votre adresse e-mail et un mot de passe stocké sous forme de hachage, ou l’adresse e-mail, l’identifiant fournisseur et l’URL de l’image de profil transmis par Google ou GitHub. Nous conservons aussi votre identifiant interne, votre nom d’utilisateur et les dates de création et de mise à jour. L’accès Invité crée un profil pseudonyme sur le serveur sans exiger d’e-mail ni de mot de passe ; votre activité reste associée à un identifiant.",
              "La progression est liée à votre profil. Dans Apollo 11, elle comprend l’état de la mission, les opérations et vérifications terminées, le temps de jeu, les brouillons et réponses des instruments, les rapports et les dates de sauvegarde. D’autres fonctions peuvent conserver des décisions, ressources, éléments d’inventaire, échantillons et statistiques lorsqu’elles sont utilisées. Ne saisissez pas de données personnelles ou sensibles dans les réponses et brouillons.",
              "Votre navigateur conserve la langue, un nom d’utilisateur en cache, un jeton d’accès à durée limitée et, pendant l’inscription avec Google ou GitHub, l’adresse e-mail en attente. Apollo 11 conserve aussi une copie locale de la progression et des brouillons liée à votre identifiant de profil, et tente de la synchroniser avec le serveur. Des préférences graphiques et un choix de fond pour la session peuvent également être stockés. Les hébergeurs peuvent traiter des données techniques de connexion et des journaux de requêtes ou d’erreurs.",
            ],
          },
          {
            title: "2. Finalités et bases légales",
            paragraphs: [
              "Les données servent à créer et sécuriser les comptes, se connecter, vérifier l'identité, sauvegarder et restaurer la progression, afficher les rapports et statistiques, prévenir les abus et maintenir le service. Les bases légales dépendent du pays et peuvent inclure la fourniture de la fonctionnalité demandée, le consentement lorsqu'il est requis et les intérêts légitimes liés à la sécurité et à la maintenance, sous réserve de vos droits.",
              "Les données personnelles ne sont pas vendues et le code de GuaTec ne met pas en œuvre de publicité personnalisée. Ne saisissez pas de données sensibles ou concernant des tiers dans les noms d'utilisateur, adresses e-mail ou autres champs.",
            ],
          },
          {
            title: "3. Prestataires et transferts",
            paragraphs: [
              "Vercel héberge le site et Render héberge l’API du déploiement actuel. Les comptes et progressions sont stockés dans la base de données associée au service API. Google ou GitHub interviennent lorsque vous choisissez un mode de connexion disponible avec ces fournisseurs. L’API peut consulter les services publics de la NASA sans avoir besoin de votre mot de passe ni de votre progression. Les liens externes, comme LinkedIn, Instagram ou des ressources éducatives, ouvrent des services régis par leurs propres politiques de confidentialité.",
              "Ces prestataires peuvent traiter des informations dans les pays où se trouvent leurs centres de données. Consultez leurs politiques et paramètres pour connaître les lieux, conditions de transfert et durées de conservation.",
            ],
          },
          {
            title: "4. Stockage et conservation",
            paragraphs: [
              "Le jeton, les préférences et la copie locale d’Apollo 11 sont conservés dans le stockage du navigateur. La déconnexion supprime le jeton, mais pas automatiquement les préférences, les copies locales ou la progression du serveur. Effacer les données du site dans le navigateur supprime ses copies locales, sans supprimer les données du serveur. La connexion Google ou GitHub peut utiliser un cookie technique de session pour vérifier l’authentification ; ce n’est pas un cookie publicitaire.",
              "Les données et progressions sont conservées tant que le compte est actif ou qu’elles sont nécessaires au service, ainsi que pour la sécurité ou les obligations légales applicables. La conservation des journaux techniques et sauvegardes des fournisseurs dépend de leurs paramètres et politiques. La déconnexion ne supprime pas automatiquement le compte. En mode Invité, perdre le jeton ou effacer les données du navigateur peut empêcher de retrouver l’accès ; conservez votre session pendant votre demande d’aide.",
            ],
          },
          {
            title: "5. Vos droits et demandes",
            paragraphs: [
              "Selon le droit applicable, vous pouvez demander l’accès, la rectification, l’effacement, la portabilité ou la limitation du traitement, vous y opposer ou retirer votre consentement lorsque cela s’applique. Vous pouvez aussi saisir l’autorité de protection des données compétente. Le contact de confidentialité de GuaTec est Andrés Sánchez Pérez : anndreesh@icloud.com. Ses coordonnées figurent dans l’onglet Contact.",
              "Pour demander l’accès, la rectification ou la suppression, écrivez à cette adresse avec votre nom d’utilisateur et votre demande. Si votre compte a une adresse e-mail associée, utilisez-la. En mode Invité, précisez que votre profil n’a pas d’e-mail ; une vérification proportionnée de la titularité sera convenue avant toute modification ou communication de données. N’envoyez ni mot de passe ni jeton. La suppression sur le serveur n’efface pas les copies locales de vos appareils ; effacez aussi les données du site dans chaque navigateur.",
            ],
          },
          {
            title: "6. Mineurs et modifications",
            paragraphs: [
              "GuaTec est éducatif ; il ne demande pas délibérément de données sensibles et n'est pas conçu pour publier des informations personnelles. Si vous êtes mineur, utilisez GuaTec sous la supervision d'un adulte lorsque la législation locale l'exige. Un parent ou tuteur qui estime que les données d'un mineur ont été fournies de manière inappropriée peut en demander l'examen ou la suppression.",
              "Cette politique peut être mise à jour en cas de modification du code, des prestataires ou des obligations légales. La date indiquée ci-dessus identifie la version publiée.",
            ],
          },
        ],
      },
      terms: {
        title: "Conditions générales d’utilisation",
        lastUpdated: "Dernière mise à jour : 7 novembre 2026",
        introduction:
          "En accédant à GuaTec, vous acceptez ces conditions. Si vous n'êtes pas d'accord, ne créez pas de compte et n'utilisez pas le service.",
        sections: [
          {
            title: "1. GuaTec",
            paragraphs: [
              "GuaTec est une simulation éducative d'exploration spatiale. Ses scènes, décisions, chronologie, résultats et systèmes sont des représentations narratives ou des systèmes de simulation ; ils ne constituent ni des données scientifiques, ni des prévisions, ni des instructions professionnelles. Les références historiques et ressources tierces restent soumises à leurs attributions et conditions respectives.",
              "GuaTec est indépendant et n'est ni affilié, ni financé, ni approuvé par la NASA. Les noms et références de la NASA identifient des sources ou des sujets connexes, et non un partenariat institutionnel.",
              "La mission jouable disponible est Apollo 11, située au Centre spatial Kennedy le 16 juillet 1969, avec quinze opérations de soutien au sol. Le joueur incarne un technicien fictif ; les activités et instruments sont des simplifications éducatives. Les missions 02 et 03 sont présentées comme du contenu à venir et ne sont pas encore jouables.",
            ],
          },
          {
            title: "2. Comptes et utilisation acceptable",
            paragraphs: [
              "Fournissez des informations de connexion exactes, gardez votre mot de passe confidentiel et signalez tout accès non autorisé suspecté. Vous êtes responsable de l'activité effectuée sur votre compte tant que vous le contrôlez.",
              "Vous pouvez utiliser le mode Invité avec un nom d’utilisateur ou les méthodes de connexion disponibles. La progression est liée au profil utilisé. Conservez l’accès à ce profil : vous déconnecter ou effacer les données du navigateur peut empêcher de retrouver une session Invité sans autre méthode de connexion. Ne partagez ni mots de passe ni jetons de session.",
            ],
            bullets: [
              "Utilisez GuaTec conformément à la loi et ne tentez pas d'accéder à des comptes, données ou systèmes sans autorisation.",
              "Ne perturbez pas le service, n'introduisez pas de code malveillant et ne contournez pas les mesures de sécurité.",
              "N'utilisez pas les noms d'utilisateur ou profils pour usurper une identité, harceler ou divulguer des informations personnelles.",
              "Ne présentez pas les simulations ou décisions comme des instructions réelles pour construire, lancer ou utiliser du matériel.",
            ],
          },
          {
            title: "3. Propriété intellectuelle et services tiers",
            paragraphs: [
              "Le code, l'identité visuelle et les contenus originaux de GuaTec appartiennent à leurs titulaires et sont proposés conformément aux licences applicables. Les ressources de la NASA, de Poly Haven, des fournisseurs de connexion et d'autres tiers restent soumises à leurs propres droits et conditions ; leur mention ne transfère aucun droit et ne signifie aucun soutien.",
              "Le site est publié sur Vercel et l’API du déploiement actuel est servie par Render. Les méthodes de connexion via Google ou GitHub, lorsqu’elles sont disponibles, ainsi que l’hébergement et la base de données dépendent de prestataires externes. Leur disponibilité et le traitement des données sont également régis par les conditions et politiques de ces prestataires. Les actualités de la NASA et les vues de ressources externes peuvent changer ou devenir indisponibles sans que les missions soient modifiées.",
            ],
          },
          {
            title: "4. Disponibilité, modifications et responsabilité",
            paragraphs: [
              "GuaTec est fourni dans son état actuel et peut être modifié, interrompu ou arrêté, avec ou sans préavis, dans les limites prévues par la loi. Malgré les efforts visant à protéger la progression sauvegardée, sa disponibilité permanente et l'absence d'interruptions ou de pertes ne sont pas garanties.",
              "Dans la mesure maximale autorisée par la loi, les personnes qui maintiennent GuaTec ne sont pas responsables des dommages indirects résultant de l'utilisation ou de l'indisponibilité de la simulation, ni des décisions fondées sur son contenu. Aucune disposition n'exclut les droits ou responsabilités légalement inaliénables.",
            ],
          },
          {
            title: "5. Suspension, confidentialité et modifications",
            paragraphs: [
              "L'accès peut être suspendu en cas de violation de ces conditions, de risque pour le service ou d'obligation légale. Le traitement des données est décrit dans la Politique de confidentialité accessible sur cette page.",
              "Ces conditions peuvent changer pour tenir compte d'améliorations, de nouvelles fonctionnalités ou d'obligations légales. Toute modification importante sera indiquée par une date de révision actualisée. La poursuite de l'utilisation après publication des nouvelles conditions vaut acceptation dans les limites du droit applicable.",
            ],
          },
          {
            title: "6. Droit applicable et contact",
            paragraphs: [
              "Les protections légales impératives et les droits des consommateurs de votre lieu de résidence s'appliquent lorsqu'ils sont pertinents. Toute question relative à ces conditions peut être envoyée via les moyens de contact ci-dessous.",
            ],
          },
        ],
      },
      contact: {
        title: "Contact",
        introduction:
          "Une question sur GuaTec, un compte, vos données personnelles ou ces conditions ? Consultez les moyens de contact de l'équipe GuaTec.",
        sections: [
          {
            title: "Confidentialité et comptes",
            paragraphs: [
              "Pour demander l'accès, la rectification ou la suppression de données, indiquez l'adresse e-mail associée au compte et, le cas échéant, votre nom d'utilisateur. N'envoyez pas de mot de passe ni de jeton de session. La propriété du compte peut devoir être vérifiée avant traitement.",
            ],
          },
          {
            title: "Retours sur GuaTec",
            paragraphs: [
              "Vous pouvez également signaler un problème d'accessibilité, une attribution inexacte ou une erreur dans le contenu éducatif. Décrivez l'écran ou le sujet concerné sans communiquer d'informations sensibles.",
            ],
          },
        ],
      },
    },
  },
};

function isLanguage(value: string | null): value is Language {
  return value !== null && LANGUAGES.includes(value as Language);
}

function isDocument(value: string | null): value is DocumentId {
  return value !== null && DOCUMENTS.includes(value as DocumentId);
}

const params = new URLSearchParams(window.location.search);
const requestedLanguage = params.get("lang");
const requestedDocument = params.get("document");
if(isLanguage(requestedLanguage))setLanguage(requestedLanguage);
let language = getLanguage();
let documentId: DocumentId = isDocument(requestedDocument) ? requestedDocument : "privacy";

const root: HTMLElement = (() => {
  const element = document.querySelector<HTMLElement>("#legal-app");
  if (!element) throw new Error("Missing #legal-app in legal.html");
  return element;
})();

function documentUrl(nextDocument: DocumentId, nextLanguage: Language): string {
  const url = new URL("/legal.html", window.location.origin);
  url.searchParams.set("document", nextDocument);
  url.searchParams.set("lang", nextLanguage);
  return `${url.pathname}${url.search}`;
}

function updateUrl(): void {
  window.history.replaceState(null, "", documentUrl(documentId, language));
  setLanguage(language);
  document.documentElement.lang = language;
}

function appendText(
  parent: HTMLElement,
  tag: string,
  className: string,
  text: string,
): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function render(): void {
  const strings = copy[language];
  const page = strings.pages[documentId];
  document.title = `${page.title} · ${strings.project}`;
  document.documentElement.lang = language;
  root.replaceChildren();

  const main = document.createElement("main");
  main.className = "legal-shell container py-4 py-lg-5";
  const card = document.createElement("article");
  card.className = `legal-card card border-0 shadow-lg overflow-hidden${documentId === "contact" ? " legal-contact-page" : ""}`;
  const body = document.createElement("div");
  body.className = "card-body p-4 p-md-5";

  const masthead = document.createElement("header");
  masthead.className =
    "legal-masthead d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3";
  const brand = document.createElement("a");
  brand.className = "legal-brand";
  brand.href = "/";
  brand.textContent = strings.project;
  masthead.append(brand);

  const languageControl = document.createElement("div");
  languageControl.className = "legal-language";
  const languageLabel = document.createElement("span");
  languageLabel.className = "legal-language-label";
  languageLabel.textContent = strings.languageLabel;
  languageControl.append(languageLabel);

  const languageGroup = document.createElement("div");
  languageGroup.className = "btn-group flex-wrap";
  languageGroup.setAttribute("role", "group");
  languageGroup.setAttribute("aria-label", strings.languageLabel);
  LANGUAGES.forEach((option) => {
    const button = document.createElement("button");
    button.className = `btn btn-sm ${
      language === option ? "btn-warning" : "btn-outline-light"
    }`;
    button.type = "button";
    button.dataset.language = option;
    button.textContent = strings.languages[option];
    button.setAttribute("aria-pressed", String(language === option));
    button.addEventListener("click", () => {
      language = option;
      updateUrl();
      render();
      root.querySelector<HTMLButtonElement>(`[data-language="${option}"]`)?.focus({preventScroll:true});
    });
    languageGroup.append(button);
  });
  languageControl.append(languageGroup);
  masthead.append(languageControl);
  body.append(masthead);

  const intro = document.createElement("section");
  intro.className = "legal-intro py-4 py-md-5";
  appendText(intro, "span", "badge rounded-pill text-bg-warning mb-3", strings.project);
  appendText(intro, "h1", "display-5 fw-bold mb-3", page.title);
  appendText(intro, "p", "legal-lead lead mb-3", page.introduction);
  appendText(intro, "p", "legal-updated small mb-0", page.lastUpdated ?? strings.lastUpdated);
  body.append(intro);

  const nav = document.createElement("nav");
  nav.className = "legal-nav nav nav-pills gap-2 mb-4";
  nav.setAttribute("aria-label", strings.project);
  DOCUMENTS.forEach((item) => {
    const link = document.createElement("a");
    link.className = `nav-link ${documentId === item ? "active" : ""}`;
    link.href = documentUrl(item, language);
    link.textContent = strings.documents[item];
    if (documentId === item) link.setAttribute("aria-current", "page");
    nav.append(link);
  });
  body.append(nav);

  const sections = document.createElement("div");
  sections.className = "legal-sections";
  page.sections.forEach((section) => {
    const sectionElement = document.createElement("section");
    sectionElement.className = "legal-section";
    appendText(sectionElement, "h2", "h5 fw-semibold mb-3", section.title);
    section.paragraphs?.forEach((paragraph) => {
      appendText(sectionElement, "p", "legal-paragraph", paragraph);
    });
    if (section.bullets) {
      const list = document.createElement("ul");
      list.className = "legal-list";
      section.bullets.forEach((bullet) => appendText(list, "li", "", bullet));
      sectionElement.append(list);
    }
    sections.append(sectionElement);
  });
  body.append(sections);

  if (documentId === "contact") {
    const contact = document.createElement("section");
    contact.className = "legal-contact card mb-4";
    contact.setAttribute("aria-label", strings.contactLinksLabel);
    const contactBody = document.createElement("div");
    contactBody.className = "card-body legal-people";
    TEAM_MEMBERS.forEach((member) => {
      const person = document.createElement("article");
      person.className = "legal-person card";
      const personBody = document.createElement("div");
      personBody.className = "card-body";
      appendText(personBody, "p", "legal-contact-eyebrow mb-2", strings.contactLinksLabel);
      appendText(personBody, "h2", "legal-person-name mb-4", member.name);

      const channels = document.createElement("div");
      channels.className = "legal-contact-channels";

      const email = document.createElement("p");
      email.className = "legal-contact-field";
      appendText(email, "strong", "legal-contact-label", `${strings.emailLabel}:`);
      if (member.email) {
        const link = document.createElement("a");
        link.className = "legal-contact-value";
        link.href = `mailto:${member.email}`;
        link.textContent = member.email;
        email.append(link);
      } else {
        appendText(email, "span", "legal-contact-value", strings.pendingLabel);
      }

      const instagram = document.createElement("p");
      instagram.className = "legal-contact-field";
      appendText(instagram, "strong", "legal-contact-label", `${strings.instagramLabel}:`);
      if (member.instagramUrl && member.instagramHandle) {
        const link = document.createElement("a");
        link.className = "legal-contact-value";
        link.href = member.instagramUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = member.instagramHandle;
        instagram.append(link);
      } else {
        appendText(instagram, "span", "legal-contact-value", strings.pendingLabel);
      }

      const linkedin = document.createElement("p");
      linkedin.className = "legal-contact-field";
      appendText(linkedin, "strong", "legal-contact-label", "LinkedIn:");
      const linkedinLink = document.createElement("a");
      linkedinLink.className = "legal-contact-value";
      linkedinLink.href = member.linkedinUrl;
      linkedinLink.target = "_blank";
      linkedinLink.rel = "noopener noreferrer";
      linkedinLink.textContent = "linkedin.com/in/anndreesh/";
      linkedin.append(linkedinLink);

      channels.append(email, instagram, linkedin);
      personBody.append(channels);
      person.append(personBody);
      contactBody.append(person);
    });
    contact.append(contactBody);
    body.insertBefore(contact, sections);
  }

  const footer = document.createElement("footer");
  footer.className =
    "legal-footer d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mt-5 pt-4";
  appendText(footer, "p", "small mb-0", strings.footer);
  const home = document.createElement("a");
  home.className = "btn btn-warning btn-sm align-self-start align-self-md-center";
  home.href = "/";
  home.textContent = strings.backToProject;
  footer.append(home);
  body.append(footer);

  const disclaimer = document.createElement("p");
  disclaimer.className = "legal-disclaimer small mt-4 mb-0";
  disclaimer.textContent = strings.projectDisclaimer;
  body.append(disclaimer);

  card.append(body);
  main.append(card);
  root.append(main);
}

window.addEventListener("popstate", () => {
  const nextParams = new URLSearchParams(window.location.search);
  const nextDocument = nextParams.get("document");
  const nextLanguage = nextParams.get("lang");
  if (isDocument(nextDocument)) documentId = nextDocument;
  if (isLanguage(nextLanguage)) language = nextLanguage;
  setLanguage(language);
  render();
});

window.addEventListener("languagechange",()=>{
  const next=getLanguage();
  if(next===language)return;
  language=next;updateUrl();render();
});

updateUrl();
render();
