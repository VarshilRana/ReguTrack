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
function renderRoleNavigation(roles) {
  const isAdmin = roles.includes("admin");
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  // Normalize legacy page-specific sidebar markup into one shared structure.
  const brandSubtitle = sidebar.querySelector(".brand-subtitle, .brand small");
  if (brandSubtitle) {
    brandSubtitle.className = "brand-subtitle";
    brandSubtitle.textContent = isAdmin ? "ADMINISTRATION" : "REGULATORY INTELLIGENCE";
  }

  let nav = sidebar.querySelector(".sidebar-scroll, .nav");
  if (!nav) {
    nav = document.createElement("div");
    nav.className = "sidebar-scroll";
    sidebar.insertBefore(nav, sidebar.querySelector(".sidebar-bottom"));
  }
  nav.className = "sidebar-scroll";
  nav.replaceChildren();

  const groups = isAdmin
    ? [
        { label: "ADMIN WORKSPACE", links: [
          ["admin-dashboard.html", "Admin Overview", "fa-solid fa-gauge-high"],
          ["users.html", "User Management", "fa-solid fa-users-gear"]
        ]},
        { label: "PLATFORM OVERSIGHT", links: [
          ["products.html", "Product Records", "fa-solid fa-capsules"],
          ["gap-analysis.html", "Gap Analysis", "fa-solid fa-wand-magic-sparkles"],
          ["ctd-dossiers.html", "CTD Dossiers", "fa-solid fa-folder-tree"],
          ["regulatory-calendar.html", "Regulatory Calendar", "fa-regular fa-calendar"],
          ["regulatory-intelligence.html", "Regulatory Intelligence", "fa-solid fa-globe"],
          ["impact-assessment.html", "Impact Assessments", "fa-solid fa-bullseye"],
          ["reports.html", "Platform Reports", "fa-solid fa-chart-column"]
        ]},
        { label: "ACCOUNT", links: [["settings.html", "My Settings", "fa-solid fa-gear"]] }
      ]
    : [
        { label: "WORKSPACE", links: [
          ["dashboard.html", "Dashboard", "fa-solid fa-chart-pie"],
          ["products.html", "Product Management", "fa-solid fa-capsules"],
          ["ctd-dossiers.html", "CTD Dossier Management", "fa-solid fa-folder-tree"],
          ["gap-analysis.html", "AI Gap Analysis", "fa-solid fa-wand-magic-sparkles"],
          ["regulatory-intelligence.html", "Regulatory Intelligence", "fa-solid fa-globe"],
          ["impact-assessment.html", "Impact Assessment", "fa-solid fa-bullseye"],
          ["regulatory-calendar.html", "Regulatory Calendar", "fa-regular fa-calendar"]
        ]},
        { label: "WORKSPACE TOOLS", links: [
          ["reports.html", "Reports & Analytics", "fa-solid fa-chart-column"],
          ["settings.html", "Settings", "fa-solid fa-gear"]
        ]}
      ];

  groups.forEach(group => {
    const label = document.createElement("div");
    label.className = "nav-label";
    label.textContent = group.label;
    nav.appendChild(label);
    group.links.forEach(([href, title, iconClass]) => {
      const link = document.createElement("a");
      link.className = "nav-link";
      link.href = href;
      link.dataset.regutrackNav = "true";
      if (href === fileName) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
      const icon = document.createElement("i");
      icon.className = iconClass;
      icon.setAttribute("aria-hidden", "true");
      link.append(icon, document.createTextNode(title));
      link.addEventListener("click", () => sidebar.classList.remove("open"));
      nav.appendChild(link);
    });
  });

  // Every page gets the same fixed sidebar and a single, accessible menu button.
  const topbar = document.querySelector(".topbar");
  const topLeft = topbar?.querySelector(".top-left") || topbar?.firstElementChild;
  let menuButton = topbar?.querySelector("#menuToggle, #menu");
  if (topbar && !menuButton) {
    menuButton = document.createElement("button");
    menuButton.type = "button";
    topLeft?.prepend(menuButton);
  }
  if (menuButton) {
    menuButton.id = "regutrackMenuToggle";
    menuButton.classList.add("mobile-menu");
    menuButton.setAttribute("type", "button");
    menuButton.setAttribute("aria-label", "Toggle navigation");
    menuButton.setAttribute("aria-controls", "sidebar");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    menuButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      const opened = sidebar.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(opened));
    });
  }

  // Remove legacy per-page toggle listeners' visual side effects by relying on
  // this one overlay/outside-click controller. Capture phase closes old handlers safely.
  if (!document.documentElement.dataset.regutrackSidebarController) {
    document.documentElement.dataset.regutrackSidebarController = "true";
    document.addEventListener("click", event => {
      if (!sidebar.contains(event.target) && !event.target.closest("#regutrackMenuToggle")) {
        sidebar.classList.remove("open");
        document.getElementById("regutrackMenuToggle")?.setAttribute("aria-expanded", "false");
      }
      const navLink = event.target.closest(".sidebar a[href]");
      if (navLink) {
        sidebar.classList.remove("open");
        document.getElementById("regutrackMenuToggle")?.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        sidebar.classList.remove("open");
        document.getElementById("regutrackMenuToggle")?.setAttribute("aria-expanded", "false");
      }
    });
  }
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
      renderRoleNavigation(roles);
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
