import { Heart, Brain, Wind, Activity, Apple, Droplets, Bone, Users, Shapes, Eye, Smile, Layers, type LucideIcon } from 'lucide-react';
export type HealthSystem = {
  id: string;
  name: string;
  matrixArea: string;
  Icon: LucideIcon;
  tone: string;
  iconSrc?: string;
  recommendationKeys: string[];
};
// Product taxonomy supplied by the team; this is presentation metadata, not eligibility logic.
export const systems: HealthSystem[] = [
  {id:'heart', iconSrc:'/icons/heart.png', name:'Heart & Circulation', matrixArea:'Cardiovascular', Icon:Heart, tone:'rose', recommendationKeys:['heart']},
  {id:'brain', iconSrc:'/icons/brain.png', name:'Brain, Sleep & Mind', matrixArea:'Brain, sleep and mental wellbeing', Icon:Brain, tone:'violet', recommendationKeys:['brain']},
  {id:'lungs', iconSrc:'/icons/lungs.png', name:'Lungs & Breathing', matrixArea:'Respiratory', Icon:Wind, tone:'sky', recommendationKeys:['lungs']},
  {id:'metabolic', iconSrc:'/icons/metabolism.png', name:'Metabolism & Hormones', matrixArea:'Metabolic and endocrine', Icon:Activity, tone:'amber', recommendationKeys:['metabolic']},
  {id:'gut', iconSrc:'/icons/digestive.png', name:'Digestive & Bowel', matrixArea:'Digestive system and bowel', Icon:Apple, tone:'peach', recommendationKeys:['gut']},
  {id:'kidneys', iconSrc:'/icons/kidneys.png', name:'Kidneys & Urinary', matrixArea:'Kidneys and urinary system', Icon:Droplets, tone:'teal', recommendationKeys:['kidneys']},
  {id:'muscles', iconSrc:'/icons/musculoskeletal.png', name:'Muscles, Bones & Joints', matrixArea:'Muscles, bones and joints', Icon:Bone, tone:'blue', recommendationKeys:['muscles','bones']},
  {id:'reproductive', iconSrc:'/icons/reproductive.png', name:'Reproductive & Sexual Health', matrixArea:'Reproductive, breast and sexual health', Icon:Users, tone:'sand', recommendationKeys:['reproductive']},
  {id:'liver', iconSrc:'/icons/liver.png', name:'Liver', matrixArea:'Liver / hepatic health', Icon:Shapes, tone:'mint', recommendationKeys:['liver']},
  {id:'eyes', iconSrc:'/icons/eyes.png', name:'Eyes & Vision', matrixArea:'Eyes and vision', Icon:Eye, tone:'indigo', recommendationKeys:['eyes']},
  {id:'oral', iconSrc:'/icons/dental.png', name:'Oral & Dental', matrixArea:'Oral and dental', Icon:Smile, tone:'green', recommendationKeys:['oral']},
  {id:'skin', iconSrc:'/icons/skin.png', name:'Skin', matrixArea:'Skin / dermatological health', Icon:Layers, tone:'orange', recommendationKeys:['skin']},
];
