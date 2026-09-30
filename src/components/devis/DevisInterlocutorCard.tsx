import Image from "next/image";

export function DevisInterlocutorCard() {
  return (
    <div className="grid grid-cols-[72px,minmax(0,1fr)] items-start gap-[18px] rounded-2xl bg-[#F8FBEA] p-5">
      <div className="relative h-[72px] w-[72px] flex-none overflow-hidden rounded-full">
        <Image
          src="/images/gauthier-hue.jpeg"
          alt="Gauthier Hue, fondateur d'ArchiMeuble"
          fill
          className="object-cover"
          style={{ objectPosition: "50% 25%" }}
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <span className="font-[Geist_Mono] text-[12px] uppercase tracking-[0.04em] text-[#3B3832]">
          Votre interlocuteur
        </span>
        <p className="m-0 text-[17px] leading-[1.45] text-[#161513]">
          Je suis Gauthier, fondateur d&apos;ArchiMeuble et ingénieur bois. Je vous accompagne de A à Z : conseil,
          conception et suivi de fabrication, et je réponds à toutes vos questions pour concrétiser votre projet.
        </p>
        <span className="text-[15px] font-semibold text-[#161513]">Gauthier Hue · fondateur et ingénieur bois</span>
      </div>
    </div>
  );
}
