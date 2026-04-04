// Time conversion utilities from PharmShift

export function timeToDecimal(time: string): number {
  if (!time) return 0;
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours + minutes / 60;
}

export function decimalToTime(decimal: number): string {
  const hours24 = Math.floor(decimal);
  const minutes = Math.round((decimal - hours24) * 60);
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function getBarStyle(
  startTime: string,
  endTime: string,
  businessStart: number = 8,
  businessEnd: number = 20
): { left: string; width: string } {
  const start = timeToDecimal(startTime);
  const end = timeToDecimal(endTime);
  const totalHours = businessEnd - businessStart;
  const left = ((Math.max(start, businessStart) - businessStart) / totalHours) * 100;
  const width = ((Math.min(end, businessEnd) - Math.max(start, businessStart)) / totalHours) * 100;
  return { left: `${Math.max(0, left)}%`, width: `${Math.max(0, width)}%` };
}

export const TIME_OPTIONS = [
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM", "6:30 PM",
  "7:00 PM", "7:30 PM", "8:00 PM",
];
