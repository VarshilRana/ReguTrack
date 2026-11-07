import { supabase } from "./supabaseClient.js";

const KEY = "regutrack_settings_v1";
const ids = ["fullName","jobTitle","email","department","orgName","region","workspaceDesc","timezone","dateFormat","notifyUpdates","notifyImpact","notifyDeadlines","notifyDossier","sourceCDSCO","sourceICH","sourceUSFDA","sourceEMA"];
const defaults = {region:"India",timezone:"Asia/Kolkata",dateFormat:"DD MMM YYYY",notifyUpdates:true,notifyImpact:true,notifyDeadlines:true,notifyDossier:true,sourceCDSCO:true,sourceICH:true,sourceUSFDA:false,sourceEMA:false};
const $ = id => document.getElementById(id);
let currentUser = null;

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}
function collect() {
  const result = {};
  ids.forEach(id => {
    const element = $(id);
    result[id] = element.type === "checkbox" ? element.checked : element.value;
  });
  return result;
}
function apply(data) {
  ids.forEach(id => {
    const element = $(id);
    if (data[id] !== undefined) {
      if (element.type === "checkbox") element.checked = !!data[id];
      else element.value = data[id];
    }
  });
}
function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2800);
}

async function loadProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return;
  currentUser = userData.user;
  $("email").value = currentUser.email || "";
  $("email").readOnly = true;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, job_title, department")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    toast("Signed in, but profile details could not be loaded.");
    return;
  }
  if (profile) {
    $("fullName").value = profile.full_name || "";
    $("jobTitle").value = profile.job_title || "";
    $("department").value = profile.department || "";
  }
}

async function save() {
  const values = collect();
  localStorage.setItem(KEY, JSON.stringify(values));

  if (currentUser) {
    const { error } = await supabase.from("profiles").upsert({
      id: currentUser.id,
      full_name: values.fullName.trim(),
      job_title: values.jobTitle.trim(),
      department: values.department.trim()
    }, { onConflict: "id" });

    if (error) {
      toast("Browser preferences saved; profile update failed: " + error.message);
      return;
    }
    toast("Profile saved to Supabase. Other preferences saved in this browser.");
  } else {
    toast("Preferences saved in this browser.");
  }
}

function reset() {
  if (!confirm("Reset all ReguTrack settings preferences to defaults?")) return;
  localStorage.removeItem(KEY);
  apply(defaults);
  save();
  toast("Default preferences restored.");
}

apply({...defaults, ...read()});
$("saveAll").addEventListener("click", save);
$("resetBtn").addEventListener("click", reset);
$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(collect(), null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "regutrack-settings.json";
  link.click();
  URL.revokeObjectURL(url);
  toast("Settings export prepared.");
});
$("passwordBtn").addEventListener("click", async () => {
  if (!currentUser?.email) return toast("No signed-in email was found.");
  const redirectTo = new URL("auth.html?recovery=1", window.location.href).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {redirectTo});
  toast(error ? error.message : "Password reset email sent.");
});
$("sessionsBtn").addEventListener("click", () => toast("Detailed active-session management is not included in Phase 1."));
$("menu").addEventListener("click", () => $("sidebar").classList.toggle("open"));
document.querySelectorAll(".tab").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(item => item.classList.toggle("active", item === button));
  document.getElementById(button.dataset.target).scrollIntoView({behavior:"smooth",block:"start"});
}));
document.querySelectorAll(".setting-section input,.setting-section select,.setting-section textarea").forEach(element => {
  element.addEventListener("change", () => localStorage.setItem(KEY, JSON.stringify(collect())));
});

await loadProfile();
