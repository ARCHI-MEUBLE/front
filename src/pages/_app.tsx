import type { AppProps } from "next/app";
import "../../styles/globals.css";
import "../styles/configurator.css";
import { CustomerProvider } from "@/context/CustomerContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <CustomerProvider>
      <Component {...pageProps} />
    </CustomerProvider>
  );
}