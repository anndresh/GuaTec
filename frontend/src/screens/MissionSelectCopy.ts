import {getLanguage,t} from '@/core/i18n';
const copy:Record<string,readonly[string,string]>={
 'Centro de misiones':['Mission center','Centre des missions'],
 'Operaciones de misión':['Mission operations','Opérations de mission'],
 'Progreso de misión':['Mission progress','Progression de la mission'],
 'Comenzar misión':['Start mission','Commencer la mission'],
 'Continuar misión':['Continue mission','Continuer la mission'],
 'Revisar misión':['Review mission','Revoir la mission'],
 'Vista del escenario de Apollo 11 en Kennedy':['View of the Apollo 11 game scene at Kennedy','Vue de la scène de jeu Apollo 11 à Kennedy'],
 'Escenario de la misión':['Mission scene','Scène de la mission'],
 'Misiones futuras':['Future missions','Missions à venir'],
 'Contenido en preparación':['Content in development','Contenu en préparation'],
 'Reintentar':['Retry','Réessayer'],
 'No hay misiones disponibles.':['No missions are available.','Aucune mission n’est disponible.'],
 'Abriendo misión…':['Opening mission…','Ouverture de la mission…'],
 'No se pudo abrir la misión. Intenta de nuevo.':['Could not open the mission. Try again.','Impossible d’ouvrir la mission. Réessayez.'],
};
export function missionSelectText(source:string){const language=getLanguage(),row=copy[source];return language==='es'?source:row?row[language==='en'?0:1]:t(source);}
