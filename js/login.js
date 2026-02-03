// Login form handler
    const form = document.getElementById("login-form");
    const errorElement = document.getElementById("error");
    const btn = form.querySelector("button");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorElement.classList.remove("show");
      btn.classList.add("loading");

      const identifier = document.getElementById("identifier").value;
      const password = document.getElementById("password").value;
      const basicAuth = btoa(`${identifier}:${password}`);

      try {
        const response = await fetch("https://learn.reboot01.com/api/auth/signin", {
          method: "POST",
          headers: { Authorization: `Basic ${basicAuth}` },
        });

        if (!response.ok) throw new Error("Invalid credentials");

        const token = (await response.text()).trim();

        if (!token || token.split(".").length !== 3) {
          throw new Error("Invalid JWT format");
        }

        sessionStorage.setItem("jwt", token);
        
        setTimeout(() => {
          window.location.href = "profile.html";
        }, 100);
      } catch (err) {
        btn.classList.remove("loading");
        errorElement.textContent = err.message === "Invalid credentials" 
          ? "✦ Invalid credentials. Please try again." 
          : "✦ Connection error. Please try again.";
        errorElement.classList.add("show");
      }
    });