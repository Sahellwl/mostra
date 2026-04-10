import { z } from 'zod'
import type { FormQuestion } from '@/lib/types'

// ── Zod schemas ───────────────────────────────────────────────────

export const QuestionSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Le libellé est requis'),
  type: z.enum(['text', 'textarea', 'select', 'radio', 'number', 'date']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
})

export const FormTemplateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  questions: z.array(QuestionSchema),
})

export type QuestionInput = z.infer<typeof QuestionSchema>
export type FormTemplateInput = z.infer<typeof FormTemplateSchema>

// ── Template par défaut ───────────────────────────────────────────

export const DEFAULT_FORM_TEMPLATE_NAME = 'Brief vidéo motion design'
export const DEFAULT_FORM_TEMPLATE_DESCRIPTION =
  'Formulaire de brief créatif standard pour les productions motion design.'

export const DEFAULT_FORM_QUESTIONS: FormQuestion[] = [
  {
    id: 'q1',
    label: 'Nom du projet',
    type: 'text',
    required: true,
    placeholder: 'Ex: Campagne de lancement produit 2025',
  },
  {
    id: 'q2',
    label: 'Décrivez votre entreprise et son activité',
    type: 'textarea',
    required: true,
    placeholder: 'Secteur, produits/services, positionnement…',
  },
  {
    id: 'q3',
    label: 'Quels sont les objectifs commerciaux de cette vidéo ?',
    type: 'textarea',
    required: true,
    placeholder: 'Ex: notoriété, génération de leads, conversion, fidélisation…',
    helpText: 'Précisez autant que possible les résultats attendus.',
  },
  {
    id: 'q4',
    label: 'Qui est votre cible principale ?',
    type: 'textarea',
    required: true,
    placeholder: "Âge, profession, centres d'intérêt, niveau de maturité…",
  },
  {
    id: 'q5',
    label: 'Quel est le ton souhaité ?',
    type: 'radio',
    required: true,
    options: ['Sérieux', 'Décalé', 'Pédagogique', 'Émotionnel', 'Premium'],
  },
  {
    id: 'q6',
    label: 'Quelle est la durée souhaitée de la vidéo ?',
    type: 'select',
    required: true,
    options: ['< 30 secondes', '30 – 60 secondes', '1 – 2 minutes', '2 – 5 minutes', '> 5 minutes'],
  },
  {
    id: 'q7',
    label: 'Quel est votre budget ?',
    type: 'select',
    required: false,
    options: ['< 2 000 €', '2 000 – 5 000 €', '5 000 – 10 000 €', '10 000 – 25 000 €', '> 25 000 €'],
  },
  {
    id: 'q8',
    label: 'Date de livraison souhaitée',
    type: 'date',
    required: false,
  },
  {
    id: 'q9',
    label: 'Avez-vous des références visuelles ou des inspirations ?',
    type: 'textarea',
    required: false,
    placeholder: "Liens, noms de vidéos, description de l'ambiance souhaitée…",
  },
  {
    id: 'q10',
    label: 'Y a-t-il des éléments à absolument inclure ou éviter ?',
    type: 'textarea',
    required: false,
    placeholder: 'Couleurs à proscrire, mentions légales obligatoires, contraintes techniques…',
  },
]
