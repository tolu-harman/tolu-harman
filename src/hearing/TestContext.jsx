/* Ported from lib/TestContext.tsx — same state shape and semantics. */
import React, { createContext, useContext, useState } from "react";

const Ctx = createContext(null);

export function TestProvider({ children }) {
  const [left, setLeft] = useState(null);
  const [right, setRight] = useState(null);
  const [preset, setPreset] = useState("recommended");
  const [personalizationOn, setPersonalizationOn] = useState(true);
  const [lastTestDate, setLastTestDate] = useState(null);
  const [vizVariant, setVizVariant] = useState("threads");

  const setEarResult = (ear, r) => (ear === "left" ? setLeft(r) : setRight(r));

  const reset = () => {
    setLeft(null);
    setRight(null);
    setPreset("recommended");
    setPersonalizationOn(true);
    setLastTestDate(null);
  };

  return (
    <Ctx.Provider
      value={{
        left,
        right,
        setEarResult,
        preset,
        setPreset,
        personalizationOn,
        setPersonalizationOn,
        lastTestDate,
        setLastTestDate,
        vizVariant,
        setVizVariant,
        reset,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useTest() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTest must be used inside TestProvider");
  return v;
}
