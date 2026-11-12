"use client";
import dynamic from "next/dynamic";
import { ApiDocumentationLoading } from "./api-documentation-loading";
import "@scalar/api-reference-react/style.css";
const Reference = dynamic(
  () => import("@scalar/api-reference-react").then((m) => m.ApiReferenceReact),
  { ssr: false, loading: () => <ApiDocumentationLoading /> },
);
export function ApiReference() {
  return (
    <Reference
      configuration={{
        url: "/api/openapi",
        proxyUrl: "",
        showDeveloperTools: "never",
        hideClientButton: true,
        persistAuth: false,
        telemetry: false,
        withDefaultFonts: false,
        agent: { disabled: true },
      }}
    />
  );
}
