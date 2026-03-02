const supabaseUrl = "https://utuuqkpgkrlqmuezqfqp.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dXVxa3Bna3JscW11ZXpxZnFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzA5ODIsImV4cCI6MjA4ODA0Njk4Mn0.-7oIwoVXSQ-NH7FEATo5jkLKUiu2SUqWdZQ_GGDS1Q4"

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey)

// ── Helpers ──────────────────────────────────────────────

function showStatus(id, message, type = "success") {
  const el = document.getElementById(id)
  if (!el) return
  el.textContent = message
  el.className = "status-msg " + type
  clearTimeout(el._timer)
  el._timer = setTimeout(() => {
    el.className = "status-msg"
  }, 4000)
}

// =======================
// PUBLIC TRACKING
// =======================

async function trackOrder() {
  const orderId = document.getElementById("orderInput").value.trim()
  const resultDiv = document.getElementById("result")
  resultDiv.innerHTML = ""

  if (!orderId) {
    resultDiv.innerHTML = '<p class="not-found">Please enter an order ID.</p>'
    return
  }

  resultDiv.innerHTML = '<p class="not-found">Loading…</p>'

  const { data: steps } = await supabase
    .from("order_steps")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at")

  const { data: notes } = await supabase
    .from("order_notes")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at")

  resultDiv.innerHTML = ""

  if (!steps || steps.length === 0) {
    resultDiv.innerHTML = '<p class="not-found">❌ Order not found. Please check your order ID.</p>'
    return
  }

  let html = '<div class="order-progress">'
  steps.forEach(step => {
    const done = step.completed
    html += `
      <div class="track-step ${done ? "done" : ""}">
        <span class="step-icon">${done ? "✅" : "⬜"}</span>
        <span class="step-label">${step.step_name}</span>
      </div>`
  })
  html += "</div>"

  if (notes && notes.length > 0) {
    html += '<div class="track-notes"><h3>Notes</h3>'
    notes.forEach(note => {
      html += `<div class="note-item">${note.note}</div>`
    })
    html += "</div>"
  }

  resultDiv.innerHTML = html
}

// =======================
// ADMIN
// =======================

async function login() {
  const email = document.getElementById("loginEmail").value.trim()
  const password = document.getElementById("loginPassword").value

  if (!email || !password) {
    showStatus("loginStatus", "Please enter your email and password.", "error")
    return
  }

  const loginBtn = document.querySelector("#loginSection button")
  loginBtn.disabled = true
  loginBtn.textContent = "Signing in…"

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  loginBtn.disabled = false
  loginBtn.textContent = "Sign In"

  if (error) {
    showStatus("loginStatus", "Login failed: " + error.message, "error")
    return
  }

  document.getElementById("loginSection").style.display = "none"
  document.getElementById("adminPanel").style.display = "block"
}

async function logout() {
  await supabase.auth.signOut()
  document.getElementById("adminPanel").style.display = "none"
  document.getElementById("loginSection").style.display = "block"
  document.getElementById("loginPassword").value = ""
}

async function createOrder() {
  const orderId = document.getElementById("newOrderId").value.trim()

  if (!orderId) {
    showStatus("createOrderStatus", "Please enter an Order ID.", "error")
    return
  }

  const { error } = await supabase.from("orders").insert({ order_id: orderId })

  if (error) {
    showStatus("createOrderStatus", "Error: " + error.message, "error")
  } else {
    showStatus("createOrderStatus", `✅ Order "${orderId}" created successfully.`, "success")
    document.getElementById("newOrderId").value = ""
  }
}

async function addStep() {
  const orderId = document.getElementById("stepOrderId").value.trim()
  const stepName = document.getElementById("stepName").value.trim()

  if (!orderId || !stepName) {
    showStatus("addStepStatus", "Please enter both Order ID and step name.", "error")
    return
  }

  const { error } = await supabase.from("order_steps").insert({ order_id: orderId, step_name: stepName })

  if (error) {
    showStatus("addStepStatus", "Error: " + error.message, "error")
  } else {
    showStatus("addStepStatus", `✅ Step "${stepName}" added to order "${orderId}".`, "success")
    document.getElementById("stepName").value = ""
  }
}

async function loadSteps() {
  const orderId = document.getElementById("toggleOrderId").value.trim()
  const stepsDiv = document.getElementById("steps")
  stepsDiv.innerHTML = ""

  if (!orderId) {
    showStatus("stepsStatus", "Please enter an Order ID.", "error")
    return
  }

  const { data: steps, error } = await supabase
    .from("order_steps")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at")

  if (error) {
    showStatus("stepsStatus", "Error: " + error.message, "error")
    return
  }

  if (!steps || steps.length === 0) {
    showStatus("stepsStatus", "No steps found for this order.", "info")
    return
  }

  showStatus("stepsStatus", `Loaded ${steps.length} step(s).`, "info")

  steps.forEach(step => {
    const item = document.createElement("div")
    item.className = "step-item" + (step.completed ? " completed" : "")

    const cb = document.createElement("input")
    cb.type = "checkbox"
    cb.checked = step.completed
    cb.onchange = () => toggleStep(step.id, step.completed, item, cb)

    const label = document.createElement("span")
    label.className = "step-label"
    label.textContent = step.step_name

    item.appendChild(cb)
    item.appendChild(label)
    stepsDiv.appendChild(item)
  })
}

async function toggleStep(id, current, itemEl, cbEl) {
  cbEl.disabled = true
  const { error } = await supabase
    .from("order_steps")
    .update({ completed: !current })
    .eq("id", id)

  cbEl.disabled = false

  if (error) {
    cbEl.checked = current
    showStatus("stepsStatus", "Error: " + error.message, "error")
  } else {
    if (!current) {
      itemEl.classList.add("completed")
    } else {
      itemEl.classList.remove("completed")
    }
    // update the in-memory value so toggling again works correctly
    cbEl.onchange = () => toggleStep(id, !current, itemEl, cbEl)
    showStatus("stepsStatus", "Step updated.", "success")
  }
}

async function addNote() {
  const orderId = document.getElementById("noteOrderId").value.trim()
  const noteText = document.getElementById("noteText").value.trim()

  if (!orderId || !noteText) {
    showStatus("addNoteStatus", "Please enter both Order ID and note text.", "error")
    return
  }

  const { error } = await supabase.from("order_notes").insert({ order_id: orderId, note: noteText })

  if (error) {
    showStatus("addNoteStatus", "Error: " + error.message, "error")
  } else {
    showStatus("addNoteStatus", "✅ Note added successfully.", "success")
    document.getElementById("noteText").value = ""
  }
}

