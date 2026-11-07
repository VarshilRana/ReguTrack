import { supabase } from "./supabaseClient.js";

const $ = id => document.getElementById(id);
let mode = "login";
const params = new URLSearchParams(window.location.search);
const recoveryMode = params.get("recovery") === "1";

function showNotice(message, type = "success") {
  const notice = $("notice");
  notice.textContent = message;
  notice.className = "notice show" + (type === "error" ? " error" : "");
}
function clearNotice() {
  $("notice").className = "notice";
  $("notice").textContent = "";
}

async function getWorkspaceDestination() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return "auth.html?mode=login";

  const { data: rows, error: roleError } = await supabase
    .from("user_roles").select("role").eq("user_id", data.user.id);
  if (roleError) throw new Error("Your workspace role could not be verified. Please try again.");

  const roles = (rows || []).map(row => row.role);
  if (roles.includes("admin")) return "admin-dashboard.html";
  if (roles.includes("regulatory_affairs") || roles.includes("reviewer")) return "dashboard.html";
  return "access-pending.html";
}

async function completeAuthentication() {
  try {
    const destination = await getWorkspaceDestination();
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "regutrack-auth-success", destination }, window.location.origin);
      return;
    }
    window.location.replace(destination);
  } catch (error) {
    showNotice(error.message || "Unable to verify your workspace role.", "error");
  }
}

function setMode(next) {
  mode = ["signup", "recovery"].includes(next) ? next : "login";
  const signup = mode === "signup";
  const recovery = mode === "recovery";
  $("loginTab").classList.toggle("active", !signup && !recovery);
  $("signupTab").classList.toggle("active", signup);
  $("nameField").hidden = !signup;
  $("confirmField").hidden = !signup && !recovery;
  $("loginMeta").hidden = signup || recovery;
  $("signupMeta").hidden = !signup;
  $("forgotLink").hidden = signup || recovery;
  $("kicker").textContent = signup ? "CREATE YOUR ACCOUNT" : recovery ? "RESET PASSWORD" : "WELCOME BACK";
  $("heading").textContent = signup ? "Create your ReguTrack account" : recovery ? "Choose a new password" : "Sign in to ReguTrack";
  $("subheading").textContent = signup
    ? "Set up your account to organize your regulatory workspace."
    : recovery
      ? "Enter and confirm your new account password."
      : "Access your regulatory workspace and continue where you left off.";
  $("submitBtn").innerHTML = signup
    ? 'Create account <span aria-hidden="true">→</span>'
    : recovery
      ? 'Update password <span aria-hidden="true">→</span>'
      : 'Log in to workspace <span aria-hidden="true">→</span>';
  $("switchCopy").innerHTML = signup
    ? 'Already have an account? <a href="#login" class="text-link switch-link">Log in</a>'
    : recovery
      ? 'Return to <a href="#login" class="text-link switch-link">log in</a>'
      : 'New to ReguTrack? <a href="#signup" class="text-link switch-link">Create an account</a>';
  $("password").autocomplete = signup || recovery ? "new-password" : "current-password";
  $("password").type = "password";
  $("togglePass").textContent = "SHOW";
  $("password").placeholder = recovery ? "Enter your new password" : "Enter your password";
  $("confirmPassword").autocomplete = "new-password";
  clearNotice();
  $("authForm").reset();
}

$("loginTab").addEventListener("click", () => setMode("login"));
$("signupTab").addEventListener("click", () => setMode("signup"));
$("switchCopy").addEventListener("click", event => {
  if (event.target.closest(".switch-link")) {
    event.preventDefault();
    setMode(mode === "login" ? "signup" : "login");
  }
});
$("togglePass").addEventListener("click", () => {
  const field = $("password");
  const visible = field.type === "password";
  field.type = visible ? "text" : "password";
  $("togglePass").textContent = visible ? "HIDE" : "SHOW";
});

$("forgotLink").addEventListener("click", async event => {
  event.preventDefault();
  const email = $("email").value.trim();
  if (!email || !$("email").checkValidity()) {
    showNotice("Enter your account email first, then request a password reset.", "error");
    $("email").focus();
    return;
  }
  const button = $("forgotLink");
  button.textContent = "Sending...";
  button.style.pointerEvents = "none";
  try {
    const redirectTo = new URL("auth.html?recovery=1", window.location.href).toString();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    showNotice("Password reset email sent. Open the link in your email to choose a new password.");
  } catch (error) {
    showNotice(error.message || "Unable to send the password reset email.", "error");
  } finally {
    button.textContent = "Forgot password?";
    button.style.pointerEvents = "";
  }
});

$("authForm").addEventListener("submit", async event => {
  event.preventDefault();
  clearNotice();
  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value;

  if (mode === "signup" && !$("fullName").value.trim()) {
    showNotice("Please enter your full name.", "error");
    $("fullName").focus(); return;
  }
  if (!email || !$("email").checkValidity()) {
    showNotice("Please enter a valid email address.", "error");
    $("email").focus(); return;
  }
  if (password.length < 8) {
    showNotice("Password must contain at least 8 characters.", "error");
    $("password").focus(); return;
  }
  if ((mode === "signup" || mode === "recovery") && password !== $("confirmPassword").value) {
    showNotice("Your passwords do not match.", "error");
    $("confirmPassword").focus(); return;
  }
  if (mode === "signup" && !$("agree").checked) {
    showNotice("Please accept the terms to continue.", "error"); return;
  }

  const submit = $("submitBtn");
  const operation = mode;
  submit.disabled = true;
  submit.textContent = operation === "signup" ? "Creating account..." : operation === "recovery" ? "Updating password..." : "Signing in...";

  try {
    if (operation === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { full_name: $("fullName").value.trim() },
          emailRedirectTo: new URL("auth.html?mode=login", window.location.href).toString()
        }
      });
      if (error) throw error;
      if (data.session) await completeAuthentication();
      else showNotice("Account created. Check your email to confirm the address, then sign in.");
    } else if (operation === "recovery") {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      setMode("login");
      showNotice("Password updated successfully. Sign in with your new password.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await completeAuthentication();
    }
  } catch (error) {
    showNotice(error?.message || "Authentication failed. Please try again.", "error");
  } finally {
    submit.disabled = false;
    submit.innerHTML = mode === "signup"
      ? 'Create account <span aria-hidden="true">→</span>'
      : mode === "recovery"
        ? 'Update password <span aria-hidden="true">→</span>'
        : 'Log in to workspace <span aria-hidden="true">→</span>';
  }
});

const initialMode = recoveryMode ? "recovery" : params.get("mode") === "signup" ? "signup" : "login";
setMode(initialMode);
const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
if (!sessionError && sessionData.session) {
  if (recoveryMode) setMode("recovery");
  else await completeAuthentication();
}
