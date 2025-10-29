import type { AppProps } from "next/app";
import { SampleCartProvider } from "@/contexts/SampleCartContext";
import "../../styles/globals.css";
import "../styles/configurator.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SampleCartProvider>
      <Component {...pageProps} />
    </SampleCartProvider>
  );
}