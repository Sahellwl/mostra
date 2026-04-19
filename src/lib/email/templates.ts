// src/lib/email/templates.ts
// Templates HTML pour les emails transactionnels MOSTRA

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mostra-five.vercel.app'

const styles = {
  container: 'max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#0a0a0a;color:#ffffff;',
  header: 'background:#111111;border-bottom:1px solid #2a2a2a;padding:24px 32px;',
  logoText: 'font-size:20px;font-weight:700;color:#ffffff;letter-spacing:2px;',
  body: 'padding:32px;',
  title: 'font-size:22px;font-weight:600;color:#ffffff;margin:0 0 12px;',
  message: 'font-size:15px;color:#a0a0a0;line-height:1.6;margin:0 0 28px;',
  button: 'display:inline-block;background:#00D76B;color:#000000;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;',
  footer: 'padding:24px 32px;border-top:1px solid #1a1a1a;',
  footerText: 'font-size:12px;color:#444444;margin:0;',
}

function baseTemplate(title: string, message: string, ctaLabel: string, ctaUrl: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;">
<div style="${styles.container}">
  <div style="${styles.header}">
    <span style="${styles.logoText}">MOSTRA</span>
  </div>
  <div style="${styles.body}">
    <h1 style="${styles.title}">${title}</h1>
    <p style="${styles.message}">${message}</p>
    <a href="${ctaUrl}" style="${styles.button}">${ctaLabel}</a>
  </div>
  <div style="${styles.footer}">
    <p style="${styles.footerText}">Envoyé par MOSTRA &mdash; <a href="${BASE_URL}" style="color:#555555;">${BASE_URL.replace('https://', '')}</a></p>
    <p style="${styles.footerText}">Vous recevez cet email car vous êtes membre d'une agence sur MOSTRA.</p>
  </div>
</div>
</body>
</html>`
}

export type EmailTemplate =
  | 'phase_ready'
  | 'form_ready'
  | 'revision_requested'
  | 'phase_approved'
  | 'comment_added'
  | 'welcome'
  | 'member_joined'
  | 'project_created'
  | 'file_uploaded'

export function renderTemplate(
  template: EmailTemplate,
  data: Record<string, string>,
  link?: string,
): { subject: string; html: string } {
  const fullUrl = link ? `${BASE_URL}${link}` : BASE_URL

  switch (template) {
    case 'phase_ready':
      return {
        subject: `✅ ${data.phaseName ?? 'Une phase'} est prête pour validation — ${data.projectName ?? 'votre projet'}`,
        html: baseTemplate(
          `${data.phaseName ?? 'Une phase'} est prête`,
          `L'agence <strong style="color:#fff">${data.agencyName ?? 'MOSTRA'}</strong> a finalisé <strong style="color:#fff">${data.phaseName ?? 'une phase'}</strong> sur le projet <strong style="color:#fff">${data.projectName ?? ''}</strong>. Consultez et validez le travail directement depuis votre espace client.`,
          'Voir la phase →',
          fullUrl,
        ),
      }

    case 'form_ready':
      return {
        subject: `📋 Formulaire à remplir — ${data.projectName ?? 'votre projet'}`,
        html: baseTemplate(
          'Un formulaire vous attend',
          `L'agence <strong style="color:#fff">${data.agencyName ?? 'MOSTRA'}</strong> a besoin de vos réponses pour avancer sur <strong style="color:#fff">${data.projectName ?? 'votre projet'}</strong>. Cela ne prend que quelques minutes.`,
          'Remplir le formulaire →',
          fullUrl,
        ),
      }

    case 'revision_requested':
      return {
        subject: `🔄 Demande de révision — ${data.projectName ?? 'votre projet'}`,
        html: baseTemplate(
          'Révision demandée',
          `<strong style="color:#fff">${data.clientName ?? 'Le client'}</strong> a demandé des modifications sur <strong style="color:#fff">${data.phaseName ?? 'une phase'}</strong> du projet <strong style="color:#fff">${data.projectName ?? ''}</strong>.`,
          'Voir les détails →',
          fullUrl,
        ),
      }

    case 'phase_approved':
      return {
        subject: `🎉 Phase approuvée — ${data.projectName ?? 'votre projet'}`,
        html: baseTemplate(
          `${data.phaseName ?? 'La phase'} a été approuvée`,
          `<strong style="color:#fff">${data.clientName ?? 'Le client'}</strong> a approuvé <strong style="color:#fff">${data.phaseName ?? 'la phase'}</strong> sur le projet <strong style="color:#fff">${data.projectName ?? ''}</strong>. Vous pouvez passer à la suite.`,
          'Voir le projet →',
          fullUrl,
        ),
      }

    case 'comment_added':
      return {
        subject: `💬 Nouveau commentaire — ${data.projectName ?? 'votre projet'}`,
        html: baseTemplate(
          'Nouveau commentaire',
          `<strong style="color:#fff">${data.authorName ?? 'Quelqu\'un'}</strong> a commenté sur le projet <strong style="color:#fff">${data.projectName ?? ''}</strong>.<br><br><em style="color:#888;border-left:3px solid #2a2a2a;padding-left:12px;display:block;">"${data.preview ?? ''}"</em>`,
          'Voir le commentaire →',
          fullUrl,
        ),
      }

    case 'file_uploaded':
      return {
        subject: `🎬 Nouveau fichier disponible — ${data.projectName ?? 'votre projet'}`,
        html: baseTemplate(
          'Nouveau fichier disponible',
          `Un nouveau fichier a été uploadé sur <strong style="color:#fff">${data.phaseName ?? 'une phase'}</strong> du projet <strong style="color:#fff">${data.projectName ?? ''}</strong>. Consultez-le dès maintenant.`,
          'Voir le fichier →',
          fullUrl,
        ),
      }

    case 'project_created':
      return {
        subject: `🚀 Votre projet a démarré — ${data.projectName ?? ''}`,
        html: baseTemplate(
          `${data.projectName ?? 'Votre projet'} a démarré`,
          `L'agence <strong style="color:#fff">${data.agencyName ?? 'MOSTRA'}</strong> vient de créer votre projet. Suivez son avancement directement depuis votre espace client.`,
          'Suivre mon projet →',
          fullUrl,
        ),
      }

    case 'member_joined':
      return {
        subject: `👋 Nouveau membre — ${data.memberName ?? ''}`,
        html: baseTemplate(
          'Nouveau membre dans votre agence',
          `<strong style="color:#fff">${data.memberName ?? 'Un nouveau membre'}</strong> a rejoint votre agence MOSTRA.`,
          'Voir l\'équipe →',
          fullUrl,
        ),
      }

    case 'welcome':
      return {
        subject: 'Bienvenue sur MOSTRA 🎬',
        html: baseTemplate(
          `Bienvenue, ${data.userName ?? ''} !`,
          `Votre compte a été créé sur <strong style="color:#fff">MOSTRA</strong>. Vous pouvez maintenant suivre l'avancement de vos projets et collaborer avec votre agence.`,
          'Accéder à mon espace →',
          fullUrl,
        ),
      }

    default:
      return {
        subject: 'Notification MOSTRA',
        html: baseTemplate('Notification', data.message ?? '', 'Voir →', fullUrl),
      }
  }
}
