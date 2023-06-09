module.exports = {
    content: [
        './_includes/**/*.html',
        './_layouts/**/*.html',
        './**/*.md',
        './*.html',
    ],
    darkMode: 'media',
    theme: {
        extend: {},
    },
    variants: {},
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
