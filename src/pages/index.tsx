import type { GetStaticProps } from "next";
import Head from "next/head";
import fs from "fs/promises";
import path from "path";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { ContactSection } from "@/components/home/ContactSection";
import {
  ColorsAndFinishesSection,
  type ColorOption
} from "@/components/home/ColorsAndFinishesSection";

type HomePageProps = {
  colors: ColorOption[];
};

export default function HomePage({ colors }: HomePageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-alabaster text-ink">
      <Head>
        <title>ArchiMeuble — Fabricant de meubles sur mesure</title>
        <meta
          name="description"
          content="Archimeuble, menuisiers à Lille, conçoit et fabrique des meubles sur mesure durables : dressing, bibliothèque, buffet, bureau ou meuble TV pour votre intérieur."
        />
      </Head>
      <Header />
      <main className="flex flex-1 flex-col">
        <HeroSection />
        <ColorsAndFinishesSection colors={colors} />
        <WhyChooseUs />
        <CategoriesSection />
        <TestimonialsSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}

const fancyNameByKey: Record<string, string> = {
  naturel: "Chêne naturel",
  blanc_clair: "Blanc opalin",
  bleu: "Bleu minéral",
  bleu_clair: "Brume azur",
  bleu_nuit: "Bleu nuit velours",
  brun2: "Noisette caramélisée",
  brun_fonce: "Noyer fumé",
  grise: "Gris galet",
  jaune: "Ambre solaire",
  kaki: "Kaki organique",
  noire: "Noir profond",
  orange: "Terracotta solaire",
  peche: "Blush pêche",
  pourpre: "Pourpre impérial",
  rouge: "Rouge grenat",
  turquoise: "Turquoise lagon",
  vert2: "Saule poudré",
  vert_fonce: "Vert forêt profonde",
  verte: "Vert sauge",
  violet: "Violet brumeux",
  violet_fonce: "Prune velours",
  argile: "Argile naturelle",
  miel: "Chêne miel"
};

const swatchByKey: Record<string, string> = {
  naturel: "#d6c5b2",
  blanc_clair: "#f5f2ec",
  bleu: "#6c8ca6",
  bleu_clair: "#a7c4cf",
  bleu_nuit: "#2d3e58",
  brun2: "#b17a55",
  brun_fonce: "#7b4b30",
  grise: "#b7b2ac",
  jaune: "#d6a546",
  kaki: "#8b8a5c",
  noire: "#1f1d1b",
  orange: "#d37a4a",
  peche: "#f2b9a8",
  pourpre: "#6f3c62",
  rouge: "#a5393b",
  turquoise: "#3a9d9f",
  vert2: "#7c9885",
  vert_fonce: "#2f4a3e",
  verte: "#809d7a",
  violet: "#7b6a93",
  violet_fonce: "#4d3057",
  argile: "#c1a99a",
  miel: "#d99e52"
};

function normalizeKeyFromFileName(fileName: string) {
  const base = path.parse(fileName).name;
  const withoutPrefix = base.replace(/^armoire_?/, "");
  const normalized = withoutPrefix
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "naturel";
}

function buildFancyName(key: string) {
  if (fancyNameByKey[key]) {
    return fancyNameByKey[key];
  }

  const base = key
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

  return `${base} élégant`.trim();
}

function buildSwatch(key: string) {
  return swatchByKey[key] ?? "#bfb5aa";
}

export const getStaticProps: GetStaticProps<HomePageProps> = async () => {
  const directory = path.join(process.cwd(), "public", "images", "photos_meuble_couleur");
  const entries = await fs.readdir(directory);

  const colors: ColorOption[] = entries
    .filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
    .map((file) => {
      const key = normalizeKeyFromFileName(file);

      return {
        slug: key,
        image: `/images/photos_meuble_couleur/${file}`,
        fancyName: buildFancyName(key),
        swatch: buildSwatch(key)
      };
    })
    .sort((a, b) => a.fancyName.localeCompare(b.fancyName, "fr"));

  return {
    props: {
      colors
    }
  };
};