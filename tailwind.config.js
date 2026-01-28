module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        chatbg: "#202123",
        chatpanel: "#343541"
      }
    }
  },
  plugins: [
  require("@tailwindcss/typography")
  ]

}
