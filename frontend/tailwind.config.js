/** @type {import('tailwindcss').Config} */
module.exports = {
  // Adicionado o caminho "./src/**/*.{js,jsx,ts,tsx}" para rastrear a pasta src
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
