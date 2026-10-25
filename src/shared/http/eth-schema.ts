import { z } from "zod";
import { parseEth } from "../money/eth";

export const ethSchema = z.string().refine((value) => {
  try {
    parseEth(value);
    return true
  } catch {
    return false
  }
}, "Valor em ETH inválido.");
