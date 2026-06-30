import { Composition } from "remotion";
import { HeroAtomic, TOTAL_FRAMES, FPS } from "./HeroAtomic";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HeroAtomic"
      component={HeroAtomic}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1200}
      height={1294}
    />
  );
};
