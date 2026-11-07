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
function applySharedShellStyles() {
  if (document.getElementById("regutrack-shell-style")) return;
  const style = document.createElement("style");
  style.id = "regutrack-shell-style";
  style.textContent = `
    :root{--regutrack-sidebar-width:255px}
    .sidebar.regutrack-sidebar{width:var(--regutrack-sidebar-width)!important;height:100dvh!important;position:fixed!important;inset:0 auto 0 0!important;z-index:1000!important;display:flex!important;flex-direction:column!important;background:#fff!important;border-right:1px solid #e8eee9!important;box-sizing:border-box!important;transition:transform .25s ease!important}
    .sidebar.regutrack-sidebar .sidebar-scroll{flex:1 1 auto!important;min-height:0!important;overflow-y:auto!important;overscroll-behavior:contain}
    .sidebar.regutrack-sidebar .sidebar-bottom{flex:0 0 auto!important}
    .main{margin-left:var(--regutrack-sidebar-width)!important;min-width:0!important;min-height:100vh!important}
    .topbar{position:sticky;top:0;z-index:900!important}
    .regutrack-menu-toggle{display:none!important}
    @media(max-width:900px){.sidebar.regutrack-sidebar{transform:translateX(-105%)!important;box-shadow:none!important}.sidebar.regutrack-sidebar.open{transform:translateX(0)!important;box-shadow:16px 0 40px rgba(16,45,30,.18)!important}.main{margin-left:0!important;width:100%!important}.regutrack-menu-toggle{display:grid!important;place-items:center;width:40px;height:40px;flex:0 0 40px;border:1px solid #e8eee9;border-radius:10px;background:#fff;color:#16845b;cursor:pointer}}
  `;
  document.head.appendChild(style);
}
function normalizePageShell(roles) {
  const isAdmin = roles.includes("admin");
  const sidebar = document.querySelector(".sidebar");
  const topbar = document.querySelector(".topbar");
  if (!sidebar || !topbar) return;

  const brand = sidebar.querySelector(".brand");
  if (brand) {
    const mark = brand.querySelector(".brand-mark, .brand-icon");
    if (mark) mark.className = "brand-mark";
    let subtitle = brand.querySelector(".brand-subtitle, small");
    if (!subtitle) {
      subtitle = document.createElement("div");
      brand.querySelector(".brand-name")?.parentElement.appendChild(subtitle);
    }
    if (subtitle) {
      subtitle.className = "brand-subtitle";
      subtitle.textContent = isAdmin ? "ADMINISTRATION" : "REGULATORY INTELLIGENCE";
    }
  }
  sidebar.classList.add("regutrack-sidebar");

  let nav = sidebar.querySelector(".sidebar-scroll, .nav");
  if (!nav) {
    nav = document.createElement("div");
    sidebar.insertBefore(nav, sidebar.querySelector(".sidebar-bottom"));
  }
  nav.className = "sidebar-scroll";
  nav.replaceChildren();

  const groups = isAdmin
    ? [
        {label:"ADMIN WORKSPACE",links:[["admin-dashboard.html","Admin Overview","fa-solid fa-gauge-high"],["users.html","User Management","fa-solid fa-users-gear"]]},
        {label:"PLATFORM OVERSIGHT",links:[["products.html","Product Records","fa-solid fa-capsules"],["gap-analysis.html","Gap Analysis","fa-solid fa-wand-magic-sparkles"],["ctd-dossiers.html","CTD Dossiers","fa-solid fa-folder-tree"],["regulatory-calendar.html","Regulatory Calendar","fa-regular fa-calendar"],["regulatory-intelligence.html","Regulatory Intelligence","fa-solid fa-globe"],["impact-assessment.html","Impact Assessments","fa-solid fa-bullseye"],["reports.html","Platform Reports","fa-solid fa-chart-column"]]},
        {label:"ACCOUNT",links:[["settings.html","My Settings","fa-solid fa-gear"]]}
      ]
    : [
        {label:"WORKSPACE",links:[["dashboard.html","Dashboard","fa-solid fa-chart-pie"],["products.html","Product Management","fa-solid fa-capsules"],["ctd-dossiers.html","CTD Dossier Management","fa-solid fa-folder-tree"],["gap-analysis.html","AI Gap Analysis","fa-solid fa-wand-magic-sparkles"],["regulatory-intelligence.html","Regulatory Intelligence","fa-solid fa-globe"],["impact-assessment.html","Impact Assessment","fa-solid fa-bullseye"],["regulatory-calendar.html","Regulatory Calendar","fa-regular fa-calendar"]]},
        {label:"WORKSPACE TOOLS",links:[["reports.html","Reports & Analytics","fa-solid fa-chart-column"],["settings.html","Settings","fa-solid fa-gear"]]}
      ];

  for (const group of groups) {
    const title=document.createElement("div"); title.className="nav-label"; title.textContent=group.label; nav.appendChild(title);
    for (const [href,label,iconClass] of group.links) {
      const link=document.createElement("a"); link.className="nav-link"; link.href=href;
      if (href===fileName) {link.classList.add("active");link.setAttribute("aria-current","page");}
      const icon=document.createElement("i"); icon.className=iconClass; icon.setAttribute("aria-hidden","true");
      link.append(icon,document.createTextNode(label)); nav.appendChild(link);
    }
  }

  const topLeft=topbar.querySelector(".top-left")||topbar.firstElementChild||topbar;
  let menu=topbar.querySelector("#regutrackMenuToggle, #menuToggle, #menu");
  if (!menu) { menu=document.createElement("button"); topLeft.prepend(menu); }
  menu.id="regutrackMenuToggle"; menu.type="button"; menu.className="regutrack-menu-toggle";
  menu.setAttribute("aria-label","Toggle navigation"); menu.setAttribute("aria-controls","sidebar"); menu.setAttribute("aria-expanded","false");
  menu.innerHTML='<i class="fa-solid fa-bars" aria-hidden="true"></i>';
}
function installSidebarController() {
  if (document.documentElement.dataset.regutrackSidebarController) return;
  document.documentElement.dataset.regutrackSidebarController="true";
  document.addEventListener("click",event=>{
    const sidebar=document.querySelector(".sidebar");
    if (!sidebar) return;
    const menu=event.target.closest("#regutrackMenuToggle");
    if (menu) {
      event.preventDefault(); event.stopImmediatePropagation();
      const open=!sidebar.classList.contains("open");
      sidebar.classList.toggle("open",open); menu.setAttribute("aria-expanded",String(open)); return;
    }
    if (event.target.closest(".sidebar a[href]")||!sidebar.contains(event.target)) {
      sidebar.classList.remove("open");
      document.getElementById("regutrackMenuToggle")?.setAttribute("aria-expanded","false");
    }
  },true);
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"){document.querySelector(".sidebar")?.classList.remove("open");document.getElementById("regutrackMenuToggle")?.setAttribute("aria-expanded","false");}
  });
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
      applySharedShellStyles();
      normalizePageShell(roles);
      installSidebarController();
      if (!isAdmin) {
        document.querySelectorAll('a[href="users.html"], a[data-admin-only], [data-admin-only]').forEach(element => element.remove());
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
      document.querySelectorAll(".profile-info [data-user-role], [data-user-role]:not(html):not(body)").forEach(el => {
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
