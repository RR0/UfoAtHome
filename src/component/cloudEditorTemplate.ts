/** Cloud controls live inside the weather panel; all numbers are recording data. */
export function cloudEditorTemplate(language: string): string {
  const t = (en: string, fr: string) => language === "fr" ? fr : en
  const number = (id: string, label: string, min = "", max = "", placeholder = "") =>
    `<label>${label}<input id="${id}" type="number" step="any" ${min ? `min="${min}"` : ""} ${max ? `max="${max}"` : ""} placeholder="${placeholder}"></label>`
  return `<div class="cloud-panel">
    <p>${t("Weather records supply coverage and wind when available. Cloud shape, thickness and size are visual estimates; they are not measured individual clouds.","Les relevés fournissent la couverture et le vent lorsqu’ils sont disponibles. La forme, l’épaisseur et la taille des nuages sont des estimations visuelles, pas des nuages individuels mesurés.")}</p>
    <div class="cloud-fields">
    <label>${t("Edit scope", "Portée des modifications")}<select id="cloud-scope"><option value="instant">${t("Current time", "Instant courant")}</option><option value="observation">${t("Whole observation", "Toute l’observation")}</option></select></label>
    <label>${t("Layer", "Couche")}<select id="cloud-layer"></select></label>
    <div class="cloud-actions"><button id="cloud-layer-add" type="button">${t("Add layer", "Ajouter une couche")}</button>
    <button id="cloud-layer-delete" type="button">${t("Delete layer", "Supprimer la couche")}</button></div>
    <label>${t("Cloud type", "Type de nuage")}<select id="cloud-type"><option value="cumulus">Cumulus</option><option value="stratus">Stratus</option><option value="stratocumulus">Stratocumulus</option><option value="cirrus">Cirrus</option><option value="unknown">${t("Unknown", "Inconnu")}</option></select></label>
    ${number("cloud-base",t("Base (m)","Base (m)"),"0")}
    ${number("cloud-thickness",t("Thickness (m)","Épaisseur (m)"),"10")}
    ${number("cloud-cover",t("Coverage (%)","Couverture (%)"),"0","100")}
    ${number("cloud-size",t("Cloud size (m)","Taille des nuages (m)"),"50")}
    ${number("cloud-density",t("Density","Densité"),"0","2")}
    ${number("cloud-darkness",t("Darkness","Obscurité"),"0","1")}
    ${number("cloud-crystal-alignment",t("Crystal alignment","Alignement des cristaux"),"0","1")}
    ${number("cloud-wind-direction",t("Layer wind direction (°)","Direction du vent de la couche (°)"),"0","360",t("General wind","Vent général"))}
    ${number("cloud-wind-speed",t("Layer wind speed (m/s)","Vitesse du vent de la couche (m/s)"),"0","",t("General wind","Vent général"))}
    ${number("cloud-seed",t("Pattern seed","Graine du motif"),"0")}
    </div>
    <p>${t("Edits pause playback and save at the current weather time. Empty layer wind fields inherit the general wind. Whole observation applies the edited property to every weather keyframe.","L’édition met la lecture en pause et enregistre à l’instant météo courant. Un vent de couche vide reprend le vent général. Toute l’observation applique la propriété modifiée à chaque point de la timeline météo.")}</p>
    <details><summary>${t("Individual clouds","Nuages individuels")}</summary><div class="cloud-fields">
    <label>${t("Individual cloud","Nuage individuel")}<select id="cloud-instance"></select></label>
    <div class="cloud-actions"><button id="cloud-instance-add" type="button">${t("Add individual cloud","Ajouter un nuage individuel")}</button>
    <button id="cloud-instance-point" type="button">${t("Point at cloud","Pointer le nuage")}</button>
    <button id="cloud-instance-delete" type="button">${t("Delete cloud","Supprimer ce nuage")}</button></div>
    <label><input id="cloud-manipulate" type="checkbox">${t("Select and drag clouds in the sky","Sélectionner et déplacer les nuages dans le ciel")}</label>
    ${number("instance-east",t("East position (m)","Position est (m)"))}
    ${number("instance-north",t("North position (m)","Position nord (m)"))}
    ${number("instance-base",t("Cloud base (m)","Base du nuage (m)"),"0")}
    ${number("instance-thickness",t("Cloud thickness (m)","Épaisseur du nuage (m)"),"10")}
    ${number("instance-width",t("Cloud width (m)","Largeur du nuage (m)"),"50")}
    ${number("instance-depth",t("Cloud depth (m)","Profondeur du nuage (m)"),"50")}
    ${number("instance-rotation",t("Cloud rotation (°)","Rotation du nuage (°)"))}
    ${number("instance-density",t("Cloud density","Densité du nuage"),"0","2")}
    ${number("instance-darkness",t("Darkness","Obscurité"),"0","1",t("Layer darkness","Obscurité de la couche"))}
    </div><p>${t("Individual clouds remain present at 0% global coverage. Dragging changes position and altitude; numeric fields provide precise dimensions. Clouds follow their layer's wind.","Les nuages individuels restent présents à 0 % de couverture globale. Le glissement change la position et l’altitude ; les champs règlent précisément les dimensions. Les nuages suivent le vent de leur couche.")}</p></details>
    <p id="cloud-status" role="status"></p></div>`
}
