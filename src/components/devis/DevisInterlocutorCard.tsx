import Image from "next/image";

export function DevisInterlocutorCard() {
  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4 rounded-2xl bg-white p-4">
      <div className="relative h-14 w-14 flex-none overflow-hidden rounded-full">
        <Image
          src="/images/gauthier-hue.jpeg"
          alt="Gauthier Hue, fondateur d'ArchiMeuble"
          fill
          sizes="56px"
          className="object-cover"
          style={{ objectPosition: "50% 25%" }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="eyebrow text-black/70">Votre interlocuteur</span>
        <p className="m-0 text-[15px] font-semibold leading-[1.3] text-black">Gauthier Hue · fondateur et ingénieur bois</p>
        <p className="m-0 text-[15px] leading-[1.4] text-black">
          Je vous accompagne de A à Z : conseil, conception et suivi de fabrication.
        </p>
      </div>
    </div>
  );
}
