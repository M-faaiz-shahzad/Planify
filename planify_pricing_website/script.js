// Planify interactions and front-end-only checkout demonstration.
document.addEventListener("DOMContentLoaded", () => {
  const billingButtons = document.querySelectorAll("[data-billing]");
  const filterButtons = document.querySelectorAll("[data-filter]");
  const cards = document.querySelectorAll(".plan-card");
  const modal = document.getElementById("checkout-modal");
  const checkoutForm = document.getElementById("checkout-form");
  const checkoutLayout = document.querySelector(".checkout-layout");
  const checkoutHeading = document.querySelector(".checkout-heading");
  const successPanel = document.getElementById("checkout-success");
  const formError = document.getElementById("form-error");
  const toast = document.getElementById("toast");
  let billingPeriod = "monthly";
  let selectedPlan = null;
  let toastTimer;
  let previousFocus = null;

  const money = value => `$${Number(value).toFixed(2)}`;

  function updatePrices(period) {
    billingPeriod = period;
    billingButtons.forEach(button => {
      const active = button.dataset.billing === period;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    cards.forEach(card => {
      const monthly = Number(card.dataset.monthly);
      const yearly = Number(card.dataset.yearly);
      const price = period === "yearly" ? yearly : monthly;
      card.querySelector(".price").textContent = price;
      const priceElement = card.querySelector(".price");
      priceElement.classList.remove("price-change");
      void priceElement.offsetWidth;
      priceElement.classList.add("price-change");
      card.querySelector(".billing-note").textContent =
        monthly === 0 ? "No card required" :
        period === "yearly" ? `Billed yearly · $${yearly * 12} per year` : "Billed monthly";
      card.querySelector(".price-period").textContent = monthly === 0 ? "/ forever" : "/ month";
    });
    if (selectedPlan) updateSummary();
  }

  billingButtons.forEach(button => button.addEventListener("click", () => updatePrices(button.dataset.billing)));

  filterButtons.forEach(button => button.addEventListener("click", () => {
    const category = button.dataset.filter;
    filterButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    cards.forEach((card, index) => {
      const matches = category === "all" || card.dataset.category === category;
      card.hidden = !matches;
      if (matches) card.style.animationDelay = `${index * 45}ms`;
    });
  }));

  function updateSummary() {
    if (!selectedPlan) return;
    const monthly = Number(selectedPlan.dataset.monthly);
    const price = billingPeriod === "yearly" ? Number(selectedPlan.dataset.yearly) : monthly;
    const yearly = billingPeriod === "yearly";
    document.getElementById("summary-plan").textContent = `${selectedPlan.dataset.plan} plan`;
    document.getElementById("summary-billing").textContent =
      monthly === 0 ? "Free plan · no subscription" : yearly ? "Annual subscription (shown monthly)" : "Monthly subscription";
    document.getElementById("summary-price").textContent = money(price);
    document.getElementById("summary-total").textContent = money(price);
    document.querySelector(".total-line strong:first-child").textContent =
      monthly === 0 ? "Due today" : yearly ? "Monthly equivalent" : "Due today";
  }

  function openCheckout(planName) {
    selectedPlan = [...cards].find(card => card.dataset.plan === planName);
    if (!selectedPlan) return;
    previousFocus = document.activeElement;
    updateSummary();
    checkoutForm.reset();
    checkoutForm.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
    formError.textContent = "";
    checkoutLayout.hidden = false;
    checkoutHeading.hidden = false;
    successPanel.hidden = true;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    document.getElementById("close-checkout").focus();
  }

  function closeCheckout() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
  }

  document.querySelectorAll("[data-plan]").forEach(button => {
    button.addEventListener("click", () => {
      button.animate([{transform:"scale(1)"},{transform:"scale(.97)"},{transform:"scale(1)"}],
        {duration:220,easing:"ease-out"});
      openCheckout(button.dataset.plan);
    });
  });

  document.getElementById("close-checkout").addEventListener("click", closeCheckout);
  document.getElementById("change-plan").addEventListener("click", closeCheckout);
  document.getElementById("success-close").addEventListener("click", closeCheckout);
  modal.addEventListener("click", event => { if (event.target === modal) closeCheckout(); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modal.hidden) closeCheckout();
  });

  // Friendly formatting for card details. These values are NOT sent or stored.
  const cardNumber = checkoutForm.elements.cardNumber;
  cardNumber.addEventListener("input", () => {
    const digits = cardNumber.value.replace(/\D/g, "").slice(0, 19);
    cardNumber.value = digits.replace(/(.{4})/g, "$1 ").trim();
    cardNumber.classList.remove("invalid");
  });
  const expiry = checkoutForm.elements.expiry;
  expiry.addEventListener("input", () => {
    const digits = expiry.value.replace(/\D/g, "").slice(0, 4);
    expiry.value = digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
    expiry.classList.remove("invalid");
  });
  checkoutForm.elements.cvc.addEventListener("input", event => {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 4);
    event.target.classList.remove("invalid");
  });
  checkoutForm.querySelectorAll("input, select").forEach(field => {
    field.addEventListener("input", () => field.classList.remove("invalid"));
    field.addEventListener("change", () => field.classList.remove("invalid"));
  });

  checkoutForm.addEventListener("submit", event => {
    event.preventDefault();
    formError.textContent = "";
    const requiredFields = [...checkoutForm.querySelectorAll("[required]")];
    let firstInvalid = null;
    requiredFields.forEach(field => {
      let valid = field.checkValidity();
      if (field.name === "cardNumber") {
        const digits = field.value.replace(/\D/g, "");
        valid = valid && digits.length >= 13 && digits.length <= 19;
      }
      if (field.name === "expiry") {
        const match = field.value.match(/^(\d{2})\s*\/\s*(\d{2})$/);
        valid = valid && !!match && Number(match[1]) >= 1 && Number(match[1]) <= 12;
        if (valid && match) {
          const expiryDate = new Date(2000 + Number(match[2]), Number(match[1]), 1);
          const now = new Date();
          valid = expiryDate > new Date(now.getFullYear(), now.getMonth(), 1);
        }
      }
      if (field.name === "cvc") valid = valid && /^\d{3,4}$/.test(field.value);
      field.classList.toggle("invalid", !valid);
      if (!valid && !firstInvalid) firstInvalid = field;
    });

    if (firstInvalid) {
      formError.textContent = firstInvalid.name === "terms"
        ? "Please agree to the terms to continue."
        : `Please check the ${firstInvalid.labels?.[0]?.textContent?.trim() || firstInvalid.name} field.`;
      firstInvalid.focus();
      return;
    }

    // Important: this is only a UI demo. No payment is taken, and no card data is transmitted.
    checkoutLayout.hidden = true;
    checkoutHeading.hidden = true;
    successPanel.hidden = false;
    successPanel.querySelector("p").textContent =
      `Your ${selectedPlan.dataset.plan} plan form passed basic checks. No payment was processed and no card information was sent or saved. Connect a payment provider to accept real payments.`;
  });

  updatePrices("monthly");
});
