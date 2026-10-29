/* ==========================================================================
   Exercise 03 — mockup behaviour.
   Static design scaffolding, not reference architecture. There is no real
   offline layer here — building that is the exercise.
   ========================================================================== */

(function () {
  "use strict";

  var SEED = window.SEED;
  if (!SEED) return;

  function time(iso) {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  var STATUS = {
    synced: { cls: "is-synced", badge: "badge-success", label: "At the office" },
    queued: { cls: "is-queued", badge: "badge-warning", label: "On this tablet only" },
    conflict: { cls: "is-conflict", badge: "badge-danger", label: "Needs your decision" },
    pending: { cls: "is-pending", badge: "", label: "Not started" },
  };

  /* ---- Day list ---------------------------------------------------------- */

  var dayList = document.querySelector("[data-jobs]");
  if (dayList) {
    SEED.jobs.forEach(function (job) {
      var s = STATUS[job.status];
      var a = document.createElement("a");
      a.className = "job-card " + s.cls;
      a.href = "job.html";
      a.innerHTML =
        '<div class="row-between row-top">' +
          "<div>" +
            '<div class="job-time">' + time(job.scheduledAt) + "</div>" +
            '<div class="job-site">' + job.site.name + "</div>" +
            '<div class="job-task">' + job.task + "</div>" +
          "</div>" +
          '<div class="text-right">' +
            '<span class="badge ' + s.badge + ' badge-dot">' + s.label + "</span>" +
            '<div class="text-sm text-secondary" style="margin-top:var(--sp-2)">' +
              job.estimatedMinutes + " min · " + SEED.checklistTemplates[job.plantType].label.split(" — ")[0] +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="job-access">' + job.site.address + " · " + job.site.access + "</div>";
      dayList.appendChild(a);
    });

    var counts = { queued: 0, conflict: 0, synced: 0 };
    SEED.jobs.forEach(function (j) { if (counts[j.status] !== undefined) counts[j.status]++; });

    var strip = document.querySelector("[data-day-stats]");
    if (strip) {
      [
        ["Sent to the office", counts.synced, ""],
        ["Waiting on this tablet", counts.queued, "text-warning"],
        ["Need your decision", counts.conflict, "text-danger"],
      ].forEach(function (t) {
        var d = document.createElement("div");
        d.className = "stat";
        d.innerHTML = '<span class="stat-label">' + t[0] + "</span>" +
          '<span class="stat-value ' + t[2] + '">' + t[1] + "</span>";
        strip.appendChild(d);
      });
    }
  }

  /* ---- Worksheet checklist ----------------------------------------------- */

  var checklist = document.querySelector("[data-checklist]");
  if (checklist) {
    var tpl = SEED.checklistTemplates.chiller;
    var sheet = SEED.sampleWorksheet;
    var answers = {};
    sheet.checks.forEach(function (c) { answers[c.id] = c; });

    tpl.items.forEach(function (item, i) {
      var given = answers[item.id] || {};
      var wrap = document.createElement("div");
      wrap.className = "check-item";

      var head =
        '<div class="check-label"><span class="check-num">' + (i + 1) + "/" + tpl.items.length +
        '</span><span>' + item.label + "</span></div>";

      var control;
      if (item.type === "measure") {
        var out = given.value !== undefined && (given.value < item.min || given.value > item.max);
        if (out) wrap.classList.add("is-out-of-range");
        control =
          '<div class="measure-row">' +
            '<input class="input" inputmode="decimal" value="' +
              (given.value !== undefined ? given.value : "") + '" aria-label="' + item.label + '" />' +
            '<span class="measure-unit">' + item.unit + "</span>" +
            '<span class="measure-range">expected ' + item.min + "–" + item.max + " " + item.unit + "</span>" +
            (out ? '<span class="badge badge-warning">Outside range</span>' : "") +
          "</div>";
      } else {
        var v = given.result;
        if (v === "fail") wrap.classList.add("is-fail");
        control =
          '<div class="tri" role="group" aria-label="' + item.label + '">' +
            '<button type="button" data-v="pass" aria-pressed="' + (v === "pass") + '">Pass</button>' +
            '<button type="button" data-v="fail" aria-pressed="' + (v === "fail") + '">Fail</button>' +
            '<button type="button" data-v="na" aria-pressed="' + (v === "na") + '">N/A</button>' +
          "</div>";
      }

      var note = "";
      if (given.note) {
        note =
          '<div class="note-required">' +
            '<label class="label">Note <span class="required">*</span></label>' +
            '<textarea class="textarea">' + given.note + "</textarea>" +
          "</div>";
      }

      wrap.innerHTML = head + control + note;
      checklist.appendChild(wrap);
    });

    // Three-way control is exclusive within its own group.
    checklist.addEventListener("click", function (ev) {
      var btn = ev.target.closest(".tri button");
      if (!btn) return;
      var group = btn.parentElement;
      group.querySelectorAll("button").forEach(function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });
      group.closest(".check-item").classList.toggle("is-fail", btn.getAttribute("data-v") === "fail");
    });

    var progress = document.querySelector("[data-checklist-progress]");
    if (progress) {
      progress.textContent = sheet.checks.length + " of " + tpl.items.length + " answered";
    }
  }

  /* ---- Parts ------------------------------------------------------------- */

  var partsHost = document.querySelector("[data-parts]");
  if (partsHost) {
    var used = {};
    SEED.sampleWorksheet.parts.forEach(function (p) { used[p.sku] = p.quantity; });

    SEED.vanStock.slice(0, 5).forEach(function (p) {
      var row = document.createElement("div");
      row.className = "part-row";
      row.innerHTML =
        '<div class="grow">' +
          '<div class="text-medium">' + p.label + "</div>" +
          '<div class="text-sm text-secondary">' + p.sku + " · " + p.onVan + " " + p.unit + " on van</div>" +
        "</div>" +
        '<div class="qty">' +
          '<button type="button" aria-label="One less ' + p.label + '">−</button>' +
          "<output>" + (used[p.sku] || 0) + "</output>" +
          '<button type="button" aria-label="One more ' + p.label + '">+</button>' +
        "</div>";
      partsHost.appendChild(row);
    });

    partsHost.addEventListener("click", function (ev) {
      var b = ev.target.closest(".qty button");
      if (!b) return;
      var out = b.parentElement.querySelector("output");
      var next = +out.textContent + (b.textContent === "+" ? 1 : -1);
      out.textContent = Math.max(0, next);
    });
  }

  /* ---- Photos ------------------------------------------------------------ */

  var photoHost = document.querySelector("[data-photos]");
  if (photoHost) {
    SEED.sampleWorksheet.photos.forEach(function (ph) {
      var d = document.createElement("div");
      d.className = "photo";
      d.innerHTML =
        '<span class="photo-flag badge ' + (ph.uploaded ? "badge-success" : "badge-warning") + '">' +
          (ph.uploaded ? "Sent" : "On tablet") + "</span>" +
        '<span class="photo-caption">' + ph.caption + "</span>";
      photoHost.insertBefore(d, photoHost.firstChild);
    });
  }

  /* ---- Sync queue -------------------------------------------------------- */

  var queueHost = document.querySelector("[data-queue]");
  if (queueHost) {
    var icons = { worksheet: "▤", photo: "◨", signature: "✎" };
    var stateLabel = {
      pending: { badge: "badge-warning", text: "Waiting for signal" },
      sent: { badge: "badge-success", text: "At the office" },
      conflict: { badge: "badge-danger", text: "Needs your decision" },
    };

    SEED.syncQueue.forEach(function (q) {
      var st = stateLabel[q.state];
      var row = document.createElement("div");
      row.className = "queue-item is-" + q.state;
      row.innerHTML =
        '<div class="queue-icon" aria-hidden="true">' + (icons[q.kind] || "•") + "</div>" +
        '<div class="grow">' +
          '<div class="text-medium">' + q.label + "</div>" +
          '<div class="queue-meta">' +
            "<span>" + q.jobRef + "</span>" +
            "<span>" + (q.sizeKb >= 1024 ? (q.sizeKb / 1024).toFixed(1) + " MB" : q.sizeKb + " KB") + "</span>" +
            "<span>" + q.attempts + " attempt" + (q.attempts === 1 ? "" : "s") + "</span>" +
          "</div>" +
        "</div>" +
        '<span class="badge ' + st.badge + ' badge-dot">' + st.text + "</span>";
      queueHost.appendChild(row);
    });

    var pending = SEED.syncQueue.filter(function (q) { return q.state === "pending"; });
    var bytes = pending.reduce(function (a, q) { return a + q.sizeKb; }, 0);

    var summary = document.querySelector("[data-queue-summary]");
    if (summary) {
      summary.textContent = pending.length + " items waiting · " + (bytes / 1024).toFixed(1) + " MB on this tablet";
    }
  }
})();
