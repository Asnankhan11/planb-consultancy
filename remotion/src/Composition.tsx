import { AbsoluteFill } from "remotion";

export const MyComposition: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1a1a2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1
        style={{
          color: "#e94560",
          fontFamily: "sans-serif",
          fontSize: 80,
        }}
      >
        PlanB Consultancy
      </h1>
    </AbsoluteFill>
  );
};
