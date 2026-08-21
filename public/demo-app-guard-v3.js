(() => {
  const consentKey = "airport-access-demo-terms-v4";
  const returnKey = "airport-access-demo-return";
  try {
    if (localStorage.getItem(consentKey)) return;
    document.documentElement.hidden = true;
    sessionStorage.setItem(returnKey, `app.html${location.search}${location.hash}`);
  } catch { document.documentElement.hidden = true; }
  location.replace("./");
})();
