const supabaseUrl = "YOUR_SUPABASE_URL"
const supabaseKey = "YOUR_PUBLIC_ANON_KEY"

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey)

// =======================
// PUBLIC TRACKING
// =======================

async function trackOrder() {
  const orderId = document.getElementById("orderInput").value
  const resultDiv = document.getElementById("result")
  resultDiv.innerHTML = ""

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

  if (!steps || steps.length === 0) {
    resultDiv.innerHTML = "Order not found"
    return
  }

  steps.forEach(step => {
    resultDiv.innerHTML += `
      <div>
        ${step.completed ? "✅" : "⬜"} ${step.step_name}
      </div>
    `
  })

  resultDiv.innerHTML += "<h3>Notes</h3>"

  notes.forEach(note => {
    resultDiv.innerHTML += `<p>${note.note}</p>`
  })
}

// =======================
// ADMIN
// =======================

async function login() {
  const email = prompt("Email")
  const password = prompt("Password")

  await supabase.auth.signInWithPassword({
    email,
    password
  })

  alert("Logged in")
}

async function createOrder() {
  const orderId = document.getElementById("newOrderId").value

  await supabase.from("orders").insert({
    order_id: orderId
  })

  alert("Order created")
}

async function addStep() {
  const orderId = document.getElementById("stepOrderId").value
  const stepName = document.getElementById("stepName").value

  await supabase.from("order_steps").insert({
    order_id: orderId,
    step_name: stepName
  })

  alert("Step added")
}

async function loadSteps() {
  const orderId = document.getElementById("toggleOrderId").value
  const stepsDiv = document.getElementById("steps")
  stepsDiv.innerHTML = ""

  const { data: steps } = await supabase
    .from("order_steps")
    .select("*")
    .eq("order_id", orderId)

  steps.forEach(step => {
    stepsDiv.innerHTML += `
      <div>
        <input type="checkbox" ${step.completed ? "checked" : ""}
        onchange="toggleStep('${step.id}', ${step.completed})">
        ${step.step_name}
      </div>
    `
  })
}

async function toggleStep(id, current) {
  await supabase
    .from("order_steps")
    .update({ completed: !current })
    .eq("id", id)

  alert("Updated")
}

async function addNote() {
  const orderId = document.getElementById("noteOrderId").value
  const noteText = document.getElementById("noteText").value

  await supabase.from("order_notes").insert({
    order_id: orderId,
    note: noteText
  })

  alert("Note added")
}
