import {
  getCodeMeta,
  getCodeUsed,
  getCodeResults,
} from "@/lib/kv";
import { isValidCodeFormat } from "@/lib/codes";
import ClientSimulator from "./ClientSimulator";
import ClientErrorPage from "./ClientErrorPage";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function ClientCodePage({ params }: PageProps) {
  const { code } = await params;

  // 1. Format check (cheap, before hitting KV)
  if (!isValidCodeFormat(code)) {
    return (
      <ClientErrorPage
        title="Lien invalide"
        message="Ce lien n'est pas valide. Verifiez le lien recu par SMS ou contactez votre representant Metal Roof Montreal."
      />
    );
  }

  // 2. KV lookup
  const meta = await getCodeMeta(code);
  if (!meta) {
    return (
      <ClientErrorPage
        title="Lien invalide ou expire"
        message="Ce lien n'existe pas ou a expire. Contactez votre representant Metal Roof Montreal pour en recevoir un nouveau."
      />
    );
  }

  // 3. Expiration check
  if (meta.expiresAt < Date.now()) {
    return (
      <ClientErrorPage
        title="Ce lien a expire"
        message="Ce lien de simulation a expire. Contactez votre representant Metal Roof Montreal pour en recevoir un nouveau."
      />
    );
  }

  // 4. Used state
  const used = await getCodeUsed(code);
  const results = used ? await getCodeResults(code) : null;

  let initialState: "unused" | "used_pending" | "used_completed";
  if (!used) {
    initialState = "unused";
  } else if (results) {
    initialState = "used_completed";
  } else {
    initialState = "used_pending";
  }

  return (
    <ClientSimulator
      code={code}
      clientName={meta.clientName}
      expiresAt={meta.expiresAt}
      initialState={initialState}
      initialResults={results}
    />
  );
}
