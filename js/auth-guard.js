import { supabase } from "./supabaseClient.js";

function goToLogin() {
  const next = window.location.pathname.split("/").pop() || "dashboard.html";
  window.location.replace("auth.html?mode=login&redirect=" + encodeURIComponent(next));
}

function roleCaption(roles) {
  if (roles.includes("admin")) return "Administrator";
  if (roles.includes("regulatory_affairs")) return "Regulatory Affairs";
  if (roles.includes("reviewer")) return "Reviewer";
  return "ReguTrack member";
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    window.alert("Unable to sign out: " + error.message);
    return;
  }
  window.location.replace("auth.html?mode=login");
}

window.reguTrackSignOut = signOut;

const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
if (sessionError || !sessionData.session) {
  goToLogin();
} else {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    await supabase.auth.signOut();
    goToLogin();
  } else {
    document.documentElement.dataset.authenticated = "true";
    document.body.dataset.userId = user.id;

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const roles = roleError ? [] : (roleRows || []).map(row => row.role);
    document.body.dataset.userRoles = roles.join(",");
    const displayName = user.user_metadata?.full_name || user.email || "ReguTrack member";

    document.querySelectorAll(".profile-info strong, .profile strong, [data-user-name]").forEach(el => {
      el.textContent = displayName;
    });
    document.querySelectorAll(".profile-info span, .profile span, [data-user-role]").forEach(el => {
      el.textContent = roleCaption(roles);
    });
    document.querySelectorAll(".avatar, [data-user-avatar]").forEach(el => {
      const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
      el.textContent = initials || "RT";
    });

    // Replace prototype sign-out handlers with real Supabase sign-out.
    let hasExistingSignOut = false;
    document.querySelectorAll("button, a").forEach(el => {
      if (/^(sign out|log out|logout)$/i.test(el.textContent.trim())) {
        hasExistingSignOut = true;
        el.removeAttribute("onclick");
        el.addEventListener("click", event => {
          event.preventDefault();
          signOut();
        });
      }
    });

    // Add a visible sign-out control only if the page has no existing one.
    const topbar = document.querySelector(".topbar");
    const actionArea = topbar?.querySelector(".top-right") || topbar;
    if (!hasExistingSignOut && actionArea && !actionArea.querySelector("[data-regutrack-signout]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Sign out";
      button.dataset.regutrackSignout = "true";
      button.style.cssText = "border:1px solid #dfe8e2;background:#fff;color:#176b57;border-radius:9px;padding:9px 12px;font:600 12px 'DM Sans',sans-serif;cursor:pointer;white-space:nowrap";
      button.addEventListener("click", signOut);
      actionArea.appendChild(button);
    }
  }
}
