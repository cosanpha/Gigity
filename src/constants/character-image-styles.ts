export interface CharacterImageStyleOption {
  value: string
  label: string
}

export const CHARACTER_IMAGE_STYLES: readonly CharacterImageStyleOption[] = [
  {
    label: 'Pixar / 3D cartoon',
    value:
      'Pixar-style 3D cartoon, rounded expressive forms, polished CGI, appealing character design',
  },
  {
    label: 'Anime',
    value:
      'Anime / manga character design, clean linework, expressive eyes, cel or soft shading',
  },
  {
    label: 'Realistic / photoreal',
    value:
      'Photorealistic, natural skin and fabric texture, believable lighting, lifestyle or portrait photography look',
  },
  {
    label: 'Soft illustrated mascot',
    value:
      'Soft illustrated mascot, friendly vector-like shapes, gentle gradients, brand-safe commercial illustration',
  },
  {
    label: 'Watercolor / painterly',
    value:
      'Watercolor or painterly illustration, soft edges, artistic brush texture, warm handcrafted feel',
  },
  {
    label: 'Comic / graphic novel',
    value:
      'Comic book or graphic novel style, bold outlines, dynamic flat color, graphic inked look',
  },
  {
    label: 'Clay / stop-motion',
    value:
      'Claymation or stop-motion puppet look, tactile sculpted surfaces, subtle imperfections, charming handmade feel',
  },
  {
    label: 'Minimal flat design',
    value:
      'Minimal flat design, simple geometric shapes, limited palette, modern UI-friendly character simplification',
  },
] as const

export const DEFAULT_CHARACTER_IMAGE_STYLE = CHARACTER_IMAGE_STYLES[0].value
