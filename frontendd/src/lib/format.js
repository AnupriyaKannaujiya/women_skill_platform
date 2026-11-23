export function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function homeFor(role) {
  if (role === "admin") return "/admin";
  if (role === "provider") return "/provider/dashboard";
  return "/customer/dashboard";
}

export function unwrapUser(data) {
  if (data && typeof data === "object" && data.user) return stripSecret(data.user);
  return stripSecret(data);
}

export function stripSecret(user) {
  if (!user || typeof user !== "object") return user;
  const copy = { ...user };
  delete copy.password;
  return copy;
}

export function getError(error, fallback = "Something went wrong. Please try again.") {
  const data = error?.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.map((item) => item.msg).filter(Boolean).join(" ");
  }
  return data?.message || fallback;
}

export function textToSkills(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function skillsToText(skill) {
  if (Array.isArray(skill)) return skill.filter(Boolean).join(", ");
  return skill || "";
}

// Older profiles saved skills as one comma-joined string ("tailoring, crafting"),
// so always split on commas and de-duplicate case-insensitively.
export function skillList(skill) {
  const raw = Array.isArray(skill) ? skill : skill ? [skill] : [];
  const seen = new Set();
  return raw
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1));
}

export function skillLabel(skill) {
  const list = skillList(skill);
  return list.length ? list.join(" · ") : "Skill not added";
}

export function plural(count, word, many = `${word}s`) {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? word : many}`;
}

export function formatMoney(value) {
  if (value === undefined || value === null || value === "") return "Price on request";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "Price on request";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function initials(name) {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "?";
}

export function phoneHref(number) {
  if (!number) return "";
  return `tel:${String(number).replace(/\s/g, "")}`;
}

export function whatsappHref(number) {
  if (!number) return "";
  let digits = String(number).replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  if (!digits) return "";
  return `https://wa.me/${digits}`;
}

export function localDateTimeValue(date = new Date()) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

// Accepted work whose booked time has passed but was never marked completed or cancelled.
export function isOverdue(booking, now = Date.now()) {
  return booking?.status === "accepted" && new Date(booking.bookingDate).getTime() < now;
}
