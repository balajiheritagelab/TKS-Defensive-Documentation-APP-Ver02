let currentStep = 1;
let record = {};
let processSteps = [];

/* ---------- VIEW CONTROL ---------- */

function show(view) {
  document.getElementById("home-view").classList.add("hidden");
  document.getElementById("wizard-view").classList.add("hidden");
  document.getElementById("records-view").classList.add("hidden");
  document.getElementById(view).classList.remove("hidden");
}

function goHome() {
  show("home-view");
}

function startNew() {
  record = {
    uuid: generateUUID(),
    created_at: new Date().toISOString(),
    craft: {},
    practitioner: {},
    materials: [],
    process_steps: []
  };

  processSteps = [];
  currentStep = 1;
  show("wizard-view");
  renderStep();
}

function cancelWizard() {
  if (confirm("Discard current documentation?")) {
    goHome();
  }
}

/* ---------- RECORD LIST ---------- */

function openRecords() {
  show("records-view");
  renderRecords();
}

function renderRecords() {
  getAllRecords(records => {
    const container = document.getElementById("records-list");
    container.innerHTML = "";

    if (!records.length) {
      container.innerHTML = "<p>No records available.</p>";
      return;
    }

    records.forEach(r => {
      const div = document.createElement("div");
      div.innerHTML = `
        <strong>${r.craft.name}</strong><br/>
        ${r.created_at}<br/>
        Hash: ${r.record_hash.substring(0,16)}...<br/>
        <button onclick='exportRecord(${JSON.stringify(r)})'>JSON</button>
        <button onclick='exportPDF(${JSON.stringify(r)})'>PDF</button>
        <button onclick="deleteRecord('${r.uuid}')">Delete</button>
        <hr/>
      `;
      container.appendChild(div);
    });
  });
}

function deleteRecord(uuid) {
  const tx = db.transaction(["records"], "readwrite");
  tx.objectStore("records").delete(uuid);
  tx.oncomplete = renderRecords;
}

/* ---------- WIZARD ---------- */

function renderStep() {
  document.getElementById("step-indicator").innerText =
    `Step ${currentStep} of 5`;

  const content = document.getElementById("step-content");

  if (currentStep === 1) {
    content.innerHTML = `
      <h2>Craft Identification</h2>
      <input id="craft_name" placeholder="Craft Name"/>
      <input id="local_name" placeholder="Local Name"/>
      <input id="category" placeholder="Category"/>
    `;
  }

  if (currentStep === 2) {
    content.innerHTML = `
      <h2>Practitioner</h2>
      <input id="practitioner" placeholder="Name"/>
      <input id="community" placeholder="Community"/>
      <input id="transmission" placeholder="Transmission Mode"/>
    `;
  }

  if (currentStep === 3) {
    content.innerHTML = `
      <h2>Materials</h2>
      <textarea id="materials" placeholder="Comma separated"></textarea>
    `;
  }

  if (currentStep === 4) {
    content.innerHTML = `
      <h2>Process Steps</h2>
      <textarea id="step_desc" placeholder="Describe step"></textarea>
      <input type="file" id="step_img" accept="image/*"/>
      <button onclick="addProcessStep()">Add Step</button>
      <div id="step-list"></div>
    `;
    renderProcessList();
  }

  if (currentStep === 5) {
    content.innerHTML = `
      <h2>Finalize</h2>
      <p>Click Next to generate hash and save.</p>
    `;
  }
}

function nextStep() {
  if (currentStep === 1) {
    record.craft = {
      name: document.getElementById("craft_name").value,
      local_name: document.getElementById("local_name").value,
      category: document.getElementById("category").value
    };
  }

  if (currentStep === 2) {
    record.practitioner = {
      name: document.getElementById("practitioner").value,
      community: document.getElementById("community").value,
      transmission: document.getElementById("transmission").value
    };
  }

  if (currentStep === 3) {
    record.materials =
      document.getElementById("materials").value.split(",");
  }

  if (currentStep === 4) {
    record.process_steps = processSteps;
  }

  if (currentStep === 5) {
    finalizeRecord();
    return;
  }

  currentStep++;
  renderStep();
}

function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    renderStep();
  }
}

function addProcessStep() {
  const desc = document.getElementById("step_desc").value;
  const file = document.getElementById("step_img").files[0];

  if (!desc || !file) return alert("Add description and image.");

  compressImage(file, async (base64) => {
    const hash = await hashObject(base64);

    processSteps.push({
      step_no: processSteps.length + 1,
      description: desc,
      image: base64,
      image_hash: hash
    });

    renderProcessList();
  });
}

function renderProcessList() {
  const list = document.getElementById("step-list");
  if (!list) return;

  list.innerHTML = processSteps.map(s => `
    <div>
      <strong>Step ${s.step_no}</strong>
      <p>${s.description}</p>
      <img src="${s.image}" width="100"/>
      <hr/>
    </div>
  `).join("");
}

async function finalizeRecord() {
  record.last_modified = new Date().toISOString();
  record.record_hash = await hashObject(record);

  saveRecord(record);

  alert("Record saved.");
  openRecords();
}
