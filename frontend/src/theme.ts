'use client';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    cssVariables: true,
    typography: {
        fontFamily: 'var(--font-geist-sans), Roboto, sans-serif',
    },
    palette: {
        mode: 'light',
        primary: {
            main: 'hsl(262.1, 83.3%, 57.8%)', // matches --primary in globals.css
        },
        secondary: {
            main: 'hsl(210, 40%, 96.1%)', // matches --secondary in globals.css
        },
        background: {
            default: 'hsl(0, 0%, 100%)', // matches --background in globals.css
            paper: 'hsl(0, 0%, 100%)', // matches --card in globals.css
        },
    },
});

export default theme;