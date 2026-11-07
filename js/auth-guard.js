import { supabase } from "./supabaseClient.js";

const fileName = window.location.pathname.split("/").pop() || "dashboard.html";
const adminOnlyPages = new Set(["admin-dashboard.html", "users.html"]);

function navigateTo(page) {
  window.location.replace(new URL(page, window.location.href).href);
}
function goToLogin() {
  navigateTo("auth.html?mode=login&redirect=" + encodeURIComponent(fileName));
}
function roleCaption(roles) {
  if (roles.includes("admin")) return "Administrator";
  if (roles.includes("regulatory_affairs")) return "Regulatory Affairs";
  if (roles.includes("reviewer")) return "Reviewer";
  return "ReguTrack member";
}
function getLandingPage(roles) {
  if (roles.includes("admin")) return "admin-dashboard.html";
  if (roles.includes("regulatory_affairs") || roles.includes("reviewer")) return "dashboard.html";
  return "access-pending.html";
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
    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id);

    if (roleError) {
      console.error("ReguTrack role verification failed:", roleError);
      const notice = document.createElement("section");
      notice.setAttribute("role", "alert");
      notice.style.cssText = "position:fixed;z-index:99999;inset:16px 16px auto;padding:16px 18px;background:#fff4e5;border:1px solid #f0d5a8;border-radius:12px;color:#684b1b;font:14px/1.5 'DM Sans',sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.08)";
      notice.innerHTML = "<strong>Workspace access could not be verified.</strong><br>Check your connection and refresh this page. If the issue continues, contact your administrator.";
      document.body.prepend(notice);
      throw roleError;
    }

    const roles = (roleRows || []).map(row => row.role);
    const isAdmin = roles.includes("admin");
    const landingPage = getLandingPage(roles);
    if (!roles.length) {
      navigateTo("access-pending.html");
    } else if (adminOnlyPages.has(fileName) && !roles.includes("admin")) {
      navigateTo("dashboard.html");
    } else if (fileName === "dashboard.html" && roles.includes("admin")) {
      navigateTo("admin-dashboard.html");
    } else if (fileName === "admin-dashboard.html" && !roles.includes("admin")) {
      navigateTo(landingPage);
    } else {
      document.documentElement.dataset.authenticated = "true";
      document.documentElement.dataset.userRole = isAdmin ? "admin" : "user";
      if (!isAdmin) {
        document.querySelectorAll('.sidebar a[href="users.html"], .nav a[href="users.html"], a[data-admin-only]').forEach(link => link.remove());
        document.querySelectorAll("[data-admin-only]").forEach(element => element.remove());
      }
      document.body.dataset.userId = user.id;
      document.body.dataset.userRoles = roles.join(",");
      document.body.dataset.currentRole = roles.includes("admin")
        ? "admin"
        : roles.includes("regulatory_affairs") ? "regulatory_affairs" : "reviewer";

      const displayName = user.user_metadata?.full_name || user.email || "ReguTrack member";
      document.querySelectorAll(".profile-info strong, .profile strong, [data-user-name]").forEach(el => {
        el.textContent = displayName;
      });
      // Update only explicit role labels; do not overwrite unrelated profile/dropdown spans.
      document.querySelectorAll(".profile-info [data-user-role], [data-user-role]").forEach(el => {
        el.textContent = roleCaption(roles);
      });
      document.querySelectorAll(".profile-info span:not([data-user-role])").forEach(el => {
        if (el.closest(".profile-info")) el.textContent = roleCaption(roles);
      });
      document.querySelectorAll(".avatar, [data-user-avatar]").forEach(el => {
        const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
        el.textContent = initials || "RT";
      });

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
}
