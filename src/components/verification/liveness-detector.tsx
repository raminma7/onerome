"use client";
import "@aws-amplify/ui-react/styles.css";
import { ThemeProvider } from "@aws-amplify/ui-react";
import { FaceLivenessDetectorCore, type AwsCredentialProvider } from "@aws-amplify/ui-react-liveness";
import { livenessCredentialsAction } from "@/server/actions/verification";

/** Italian copy for the AWS liveness widget (English is the library default). */
const IT_TEXT = {
  hintCenterFaceText: "Centra il volto",
  hintCenterFaceInstructionText: "Inserisci il volto nell'ovale",
  hintConnectingText: "Connessione…",
  hintVerifyingText: "Verifica in corso…",
  hintCheckCompleteText: "Controllo completato",
  hintFaceDetectedText: "Volto rilevato",
  hintMoveFaceFrontOfCameraText: "Posiziona il volto davanti alla fotocamera",
  hintTooManyFacesText: "Assicurati che ci sia un solo volto",
  hintTooCloseText: "Allontanati un po'",
  hintTooFarText: "Avvicinati",
  hintHoldFaceForFreshnessText: "Resta fermo/a",
  hintIlluminationTooBrightText: "Spostati in un luogo meno luminoso",
  hintIlluminationTooDarkText: "Spostati in un luogo più luminoso",
  hintIlluminationNormalText: "Luce ok",
  hintFaceOffCenterText: "Il volto non è al centro",
  hintMatchIndicatorText: "50% completato. Continua ad avvicinarti.",
  hintCanNotIdentifyText: "Posiziona il volto davanti alla fotocamera",
  startScreenBeginCheckText: "Inizia il controllo",
  photosensitivityWarningHeadingText: "Avviso di fotosensibilità",
  photosensitivityWarningBodyText: "Durante la verifica vengono mostrati colori lampeggianti. Fai attenzione se sei fotosensibile.",
  photosensitivityWarningInfoText: "Alcune persone possono avere crisi epilettiche se esposte a luci colorate.",
  photosensitivityWarningLabelText: "Info fotosensibilità",
  goodFitCaptionText: "Posizione corretta",
  tooFarCaptionText: "Troppo lontano",
  cancelLivenessCheckText: "Annulla",
  recordingIndicatorText: "Rec",
  waitingCameraPermissionText: "In attesa del permesso della fotocamera…",
  retryCameraPermissionsText: "Riprova",
  cameraNotFoundHeadingText: "Fotocamera non accessibile",
  cameraNotFoundMessageText: "Controlla che la fotocamera sia collegata e che nessun'altra app la stia usando. Potresti dover consentire l'accesso nelle impostazioni.",
  cameraMinSpecificationsHeadingText: "La fotocamera non soddisfa i requisiti minimi",
  cameraMinSpecificationsMessageText: "Serve una risoluzione di almeno 320×240 e 15 fotogrammi al secondo.",
};

export default function LivenessDetector({ sessionId, region, locale, onComplete, onError, onCancel }: {
  sessionId: string; region: string; locale: "it" | "en";
  onComplete: () => void; onError: (message: string) => void; onCancel: () => void;
}) {
  const credentialProvider: AwsCredentialProvider = async () => {
    const result = await livenessCredentialsAction(sessionId);
    if (!result.ok) throw new Error(result.error);
    return {
      accessKeyId: result.data.accessKeyId,
      secretAccessKey: result.data.secretAccessKey,
      sessionToken: result.data.sessionToken,
      expiration: result.data.expiration ? new Date(result.data.expiration) : undefined,
    };
  };

  return (
    <ThemeProvider>
      <div className="overflow-hidden rounded-[1.75rem] bg-white">
        <FaceLivenessDetectorCore
          sessionId={sessionId}
          region={region}
          disableStartScreen
          onAnalysisComplete={async () => onComplete()}
          onUserCancel={onCancel}
          onError={(e) => onError(e.state)}
          config={{ credentialProvider }}
          displayText={locale === "it" ? IT_TEXT : undefined}
        />
      </div>
    </ThemeProvider>
  );
}
