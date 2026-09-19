export function calculateFareDetails(
  weightKg: number,
  size: "small" | "medium" | "large",
  serviceClass: string = "Super Fast",
  pickupType: "depot" | "doorstep" = "depot",
  deliveryType: "depot" | "doorstep" = "depot"
): {
  baseFreightFare: number;
  pickupFee: number;
  deliveryFee: number;
  totalFare: number;
} {
  if (weightKg <= 0) {
    return { baseFreightFare: 0, pickupFee: 0, deliveryFee: 0, totalFare: 0 };
  }

  const baseFare = 50;
  const weightFare = weightKg * 12;

  let sizeMultiplier = 1.0;
  if (size === "medium") sizeMultiplier = 1.25;
  if (size === "large") sizeMultiplier = 1.5;

  let classMultiplier = 1.0;
  if (serviceClass.includes("Garuda") || serviceClass.includes("Volvo")) classMultiplier = 1.3;
  else if (serviceClass.includes("Swift") || serviceClass.includes("Express")) classMultiplier = 1.2;
  else if (serviceClass.includes("Super Fast")) classMultiplier = 1.1;

  const baseFreightFare = Math.round((baseFare + weightFare) * sizeMultiplier * classMultiplier);

  const pickupFee = pickupType === "doorstep" ? 40 : 0;
  const deliveryFee = deliveryType === "doorstep" ? 40 : 0;

  const totalFare = baseFreightFare + pickupFee + deliveryFee;

  return {
    baseFreightFare,
    pickupFee,
    deliveryFee,
    totalFare,
  };
}

export function calculateFare(
  weightKg: number,
  size: "small" | "medium" | "large",
  serviceClass: string = "Super Fast",
  pickupType: "depot" | "doorstep" = "depot",
  deliveryType: "depot" | "doorstep" = "depot"
): number {
  return calculateFareDetails(weightKg, size, serviceClass, pickupType, deliveryType).totalFare;
}
