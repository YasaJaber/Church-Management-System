// مسح البيانات المحفوظة في المتصفح
localStorage.clear();
sessionStorage.clear();

// مسح cookies
document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

console.log("تم مسح جميع البيانات المحفوظة");
location.reload(true);
