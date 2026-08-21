export const CATEGORY_IDS = Object.freeze(["railway", "road", "weather", "facility"]);

export function createLayerControl({ map, layerIdsByCategory, visibility, labelFor, onVisibilityChange }) {
  const container = document.querySelector("#layer-control");
  for (const previous of container.querySelectorAll(".layer-toggle")) previous.remove();

  for (const category of CATEGORY_IDS) {
    const label = labelFor(category);
    const wrapper = document.createElement("label");
    wrapper.className = `layer-toggle category-${category}`;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = visibility[category];
    input.value = category;
    input.setAttribute("aria-label", label);
    input.addEventListener("change", () => {
      const visibility = input.checked ? "visible" : "none";
      for (const layerId of layerIdsByCategory[category] ?? []) {
        if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visibility);
      }
      onVisibilityChange(category, input.checked);
    });

    const marker = document.createElement("span");
    marker.className = "toggle-marker";
    marker.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.textContent = label;
    wrapper.append(input, marker, text);
    container.append(wrapper);
  }
}
