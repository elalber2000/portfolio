const ACCENTS = [
  "#8EA2FF", // indigo
  "#7EE6D7", // teal
  "#F2C879", // amber
  "#BCA7FF", // violet
  "#A3FFB0"  // mint
];

const slug = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

const getSelectedSkillsFromURL = () => {
  const u = new URL(window.location.href);
  const raw = u.searchParams.get("skill");
  if (!raw) return [];
  return raw
    .split(",")
    .map((x) => slug(x))
    .filter(Boolean);
};

const setSkillsToURL = (skills) => {
  const u = new URL(window.location.href);
  if (skills.length) u.searchParams.set("skill", skills.join(","));
  else u.searchParams.delete("skill");
  window.history.replaceState({}, "", u.toString());
};

const pickAccent = () => {
  const c = ACCENTS[Math.floor(Math.random() * ACCENTS.length)];
  document.documentElement.style.setProperty("--accent", c);
};

const el = (tag, attrs = {}, children = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "dataset") Object.assign(n.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const ch of children) n.append(ch);
  return n;
};

const text = (s) => document.createTextNode(String(s ?? ""));

const toggleSkill = (selected, s) => {
  const has = selected.includes(s);
  return has ? selected.filter((x) => x !== s) : selected.concat([s]);
};

/* ---- ordering helpers (latest → earliest) ----
   The JSON can already be in order; this provides stability if you edit later. */
const parseEndYear = (dates) => {
  const d = String(dates || "").toLowerCase();
  if (d.includes("present")) return 9999;
  const m = d.match(/(\d{4})\s*$/);
  if (m) return Number(m[1]);
  const all = d.match(/(\d{4})/g);
  if (!all) return -1;
  return Number(all[all.length - 1]);
};

const sortLatestFirst = (items, key) => {
  const arr = Array.isArray(items) ? items.slice() : [];
  return arr.sort((a, b) => parseEndYear(b[key]) - parseEndYear(a[key]));
};

const renderSkillsGrouped = (groups, selected, onToggle) => {
  const host = document.getElementById("skillsGroups");
  host.innerHTML = "";

  groups.forEach((g) => {
    const groupTitle = el("div", { class: "skill-group-title" }, [text(g.topic)]);
    const list = el("div", { class: "skill-list" });

    g.skills.forEach((rawSkill) => {
      const s = slug(rawSkill);
      const a = el(
        "a",
        {
          href: `?skill=${encodeURIComponent(s)}`,
          class: "skill",
          dataset: { selected: selected.includes(s) ? "true" : "false" }
        },
        [text(rawSkill)]
      );

      a.addEventListener("click", (e) => {
        e.preventDefault();
        onToggle(s);
      });

      list.appendChild(a);
    });

    host.appendChild(el("div", { class: "skill-group" }, [groupTitle, list]));
  });
};

const renderProjects = (projects, selected) => {
  const host = document.getElementById("projectList");
  host.innerHTML = "";

  const filtered = selected.length
    ? projects.filter((p) => {
        const pSkills = (p.skills || []).map(slug);
        return selected.every((ss) => pSkills.includes(ss));
      })
    : projects;

  const status = document.getElementById("filterStatus");
  status.textContent = selected.length
    ? `filter: skill=${selected.join(",")} :: ${filtered.length}/${projects.length}`
    : `filter: none :: ${filtered.length}/${projects.length}`;

  filtered.forEach((p) => {
    const head = el("div", { class: "block-head" }, [
      el("div", { class: "block-title" }, [text(p.title)]),
      el("div", { class: "block-meta" }, [text(p.one_liner || "")])
    ]);

    const links = [];
    if (p.links?.repo) links.push(el("a", { href: p.links.repo, target: "_blank", rel: "noreferrer" }, [text("repo")]));
    if (p.links?.demo) links.push(el("a", { href: p.links.demo, target: "_blank", rel: "noreferrer" }, [text("demo")]));
    if (p.links?.writeup) links.push(el("a", { href: p.links.writeup, target: "_blank", rel: "noreferrer" }, [text("writeup")]));
    if (p.links?.arxiv) links.push(el("a", { href: p.links.arxiv, target: "_blank", rel: "noreferrer" }, [text("arxiv")]));

    const kv = el("div", { class: "kv" }, [
      text("links: "),
      ...links.reduce((acc, a, i) => (i ? acc.concat([text(" "), a]) : acc.concat([a])), [])
    ]);

    const bullets = el("ul", { class: "bullets" }, (p.highlights || []).map((h) => el("li", {}, [text(h)])));

    const tags = el("div", { class: "tags" }, [
      text("skills: "),
      ...(p.skills || []).map((t) => el("span", { class: "tag" }, [text(t)]))
    ]);

    host.appendChild(
      el("div", { class: "block" }, [
        text(":: "),
        head,
        kv,
        bullets,
        tags,
      ])
    );
  });
};

const renderExperience = (items) => {
  const host = document.getElementById("experienceList");
  host.innerHTML = "";

  const ordered = sortLatestFirst(items, "dates");

  ordered.forEach((x) => {
    const head = el("div", { class: "block-head" }, [
      el("div", { class: "block-title" }, [text(`${x.org} :: ${x.role}`)]),
      el("div", { class: "block-meta" }, [text(`${x.location} · ${x.dates}`)])
    ]);

    const bullets = el("ul", { class: "bullets" }, (x.bullets || []).map((b) => el("li", {}, [text(b)])));

    const tags = el("div", { class: "tags" }, [
      text("skills: "),
      ...(x.skills || []).map((t) => el("span", { class: "tag" }, [text(t)]))
    ]);

    host.appendChild(
      el("div", { class: "block" }, [
        text(":: "),
        head,
        bullets,
        tags,
      ])
    );
  });
};

const renderEducation = (items) => {
  const host = document.getElementById("educationList");
  host.innerHTML = "";

  const ordered = sortLatestFirst(items, "dates");

  ordered.forEach((x) => {
    const head = el("div", { class: "block-head" }, [
      el("div", { class: "block-title" }, [text(x.school)]),
      el("div", { class: "block-meta" }, [text(`${x.location} · ${x.dates}`)])
    ]);

    const body = el("div", { class: "kv" }, [text(`degree: ${x.degree}`)]);

    host.appendChild(
      el("div", { class: "block" }, [
        text(":: "),
        head,
        body,
      ])
    );
  });
};

const renderPubs = (items) => {
  const host = document.getElementById("pubList");
  host.innerHTML = "";

  // publications are usually already ordered; leave as-is unless you add dates later
  items.forEach((p) => {
    const head = el("div", { class: "block-head" }, [
      el("div", { class: "block-title" }, [text(`${p.venue} :: ${p.role}`)]),
      el("div", { class: "block-meta" }, [text(p.title)])
    ]);

    const links = [];
    if (p.links?.arxiv) links.push(el("a", { href: p.links.arxiv, target: "_blank", rel: "noreferrer" }, [text("arxiv")]));
    if (p.links?.pdf) links.push(el("a", { href: p.links.pdf, target: "_blank", rel: "noreferrer" }, [text("pdf")]));
    if (p.links?.code) links.push(el("a", { href: p.links.code, target: "_blank", rel: "noreferrer" }, [text("code")]));

    const kv = el("div", { class: "kv" }, [
      text("links: "),
      ...links.reduce((acc, a, i) => (i ? acc.concat([text(" "), a]) : acc.concat([a])), [])
    ]);

    const tags = el("div", { class: "tags" }, [
      text("skills: "),
      ...(p.skills || []).map((t) => el("span", { class: "tag" }, [text(t)]))
    ]);

    host.appendChild(
      el("div", { class: "block" }, [
        text(":: "),
        head,
        kv,
        tags,
      ])
    );
  });
};

(async function main() {
  pickAccent();

  const res = await fetch("./data.json", { cache: "no-store" });
  const data = await res.json();

  document.getElementById("name").textContent = data.person?.name || "";
  document.getElementById("headline").textContent = data.person?.headline || "";
  document.getElementById("profile").textContent = data.profile || "";
  document.getElementById("metaLine").textContent = data.person?.location || "";

  const links = data.person?.links || {};
  document.getElementById("linkEmail").href = links.email || "#";
  document.getElementById("linkGithub").href = links.github || "#";
  document.getElementById("linkArxiv").href = links.arxiv || "#";
  document.getElementById("linkCV").href = links.cv_pdf || "#";

  document.getElementById("contactLine").textContent =
    `email: ${String(links.email || "").replace("mailto:", "")}  ::  github: ${links.github || ""}`;

  let selected = getSelectedSkillsFromURL();

  const onToggle = (s) => {
    selected = toggleSkill(selected, s);
    setSkillsToURL(selected);
    renderSkillsGrouped(data.skill_groups || [], selected, onToggle);
    renderProjects(data.projects || [], selected);
  };

  document.getElementById("clearFilters").addEventListener("click", (e) => {
    e.preventDefault();
    selected = [];
    setSkillsToURL(selected);
    renderSkillsGrouped(data.skill_groups || [], selected, onToggle);
    renderProjects(data.projects || [], selected);
  });

  renderExperience(data.experience || []);
  renderEducation(data.education || []);
  renderPubs(data.publications || []);

  renderSkillsGrouped(data.skill_groups || [], selected, onToggle);
  renderProjects(data.projects || [], selected);

  window.addEventListener("popstate", () => {
    selected = getSelectedSkillsFromURL();
    renderSkillsGrouped(data.skill_groups || [], selected, onToggle);
    renderProjects(data.projects || [], selected);
  });
})();
