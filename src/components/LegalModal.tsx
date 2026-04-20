import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'

interface Props {
  onAccept: () => void
  onDecline: () => void
}

export function LegalModal({ onAccept, onDecline }: Props) {
  const [accepted, setAccepted] = useState(false)
  const [declining, setDeclining] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
         style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-lg flex flex-col gap-5" style={{ maxHeight: '100dvh', paddingTop: 32, paddingBottom: 24 }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-1 shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(123,240,160,0.1)', border: '1px solid rgba(123,240,160,0.3)' }}>
            <ShieldCheck size={20} color="#7BF0A0" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ fontFamily: 'Syne' }}>Aviso Legal y Política de Privacidad</h1>
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Leé y aceptá antes de continuar</p>
          </div>
        </div>

        {/* Contenido scrolleable */}
        <div className="overflow-y-auto rounded-2xl flex-1 min-h-0 px-4 py-4 flex flex-col gap-4 text-sm"
             style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)', lineHeight: '1.6' }}>

          <Section title="1. Naturaleza del Servicio y Responsabilidad del Usuario">
            El usuario reconoce y acepta que el uso de FitTrack y la carga de imágenes para el análisis de progreso mediante Inteligencia Artificial se realiza bajo su propia decisión, riesgo y consentimiento explícito. La aplicación proporciona comparativas estadísticas y recomendaciones basadas en algoritmos de IA que deben ser tomadas únicamente como referencia informativa y no como un diagnóstico médico, nutricional o profesional.
          </Section>

          <Section title="2. Privacidad y Acceso a los Archivos">
            <p className="mb-2">Entendemos la sensibilidad de las imágenes de progreso físico. Por ello, establecemos los siguientes pilares de seguridad:</p>
            <ul className="flex flex-col gap-1.5">
              <li><strong style={{ color: '#7BF0A0' }}>Acceso Restringido:</strong> Los archivos y fotografías subidos por el usuario son de carácter estrictamente privado. Solo el usuario que ha iniciado sesión en su cuenta puede visualizar dichas imágenes.</li>
              <li><strong style={{ color: '#7BF0A0' }}>Prohibición de Divulgación:</strong> La plataforma no compartirá, venderá ni mostrará las imágenes a terceros, ni a otros usuarios de la comunidad, sin un permiso previo, explícito y por escrito del titular.</li>
              <li><strong style={{ color: '#7BF0A0' }}>Uso de la IA:</strong> El procesamiento de las fotos por parte de la IA se realiza de forma automatizada para generar métricas de comparación. Este proceso no implica la revisión humana de las imágenes.</li>
            </ul>
          </Section>

          <Section title="3. Propiedad de las Imágenes">
            El usuario conserva todos los derechos de propiedad intelectual sobre las fotografías que sube. Al utilizar la app, el usuario garantiza que tiene el derecho legal de subir dichas imágenes y que las mismas no infringen derechos de terceros ni normativas de convivencia.
          </Section>

          <Section title="4. Recomendaciones y Exención de Responsabilidad">
            <p className="mb-2">Las "recomendaciones de mejora" generadas por la IA son sugerencias automatizadas basadas en patrones visuales. FitTrack no se hace responsable por:</p>
            <ul className="flex flex-col gap-1" style={{ color: 'var(--color-muted)' }}>
              <li>• Resultados físicos derivados de seguir las sugerencias.</li>
              <li>• Interpretaciones erróneas del progreso por parte del usuario.</li>
              <li>• Uso inadecuado de la información proporcionada.</li>
            </ul>
          </Section>

          <Section title="5. Eliminación de Datos">
            El usuario tiene el derecho de eliminar sus fotos y su cuenta en cualquier momento. Una vez ejecutada la acción de borrado, los archivos serán eliminados de nuestros servidores activos de forma permanente dentro de los plazos técnicos estipulados por la ley.
          </Section>
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-3 px-1 cursor-pointer shrink-0">
          <div className="relative mt-0.5 shrink-0">
            <input
              type="checkbox"
              className="sr-only"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
            />
            <div className="w-5 h-5 rounded flex items-center justify-center transition-all"
                 style={{
                   background: accepted ? '#7BF0A0' : 'var(--color-surface-2)',
                   border: `1.5px solid ${accepted ? '#7BF0A0' : 'var(--color-border)'}`,
                 }}>
              {accepted && (
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                  <path d="M1 4L4 7.5L10 1" stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
            He leído y acepto el Aviso Legal y la Política de Privacidad
          </span>
        </label>

        {/* Botones */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={onAccept}
            disabled={!accepted}
            className="btn-primary"
            style={{ opacity: accepted ? 1 : 0.4 }}
          >
            Aceptar y continuar
          </button>
          <button
            onClick={() => { setDeclining(true); onDecline() }}
            disabled={declining}
            className="w-full py-3 rounded-xl text-sm"
            style={{ color: 'var(--color-muted)', background: 'transparent' }}
          >
            No acepto — cerrar sesión
          </button>
        </div>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="text-sm font-bold" style={{ fontFamily: 'Syne', color: '#7BF0A0' }}>{title}</h2>
      <div style={{ color: 'var(--color-muted)' }}>{children}</div>
    </div>
  )
}
