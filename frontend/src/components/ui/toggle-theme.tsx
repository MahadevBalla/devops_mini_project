'use client';

import React from 'react';
import { MonitorCogIcon, MoonStarIcon, SunIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const THEME_OPTIONS = [
	{
		icon: MonitorCogIcon,
		value: 'system',
	},
	{
		icon: SunIcon,
		value: 'light',
	},
	{
		icon: MoonStarIcon,
		value: 'dark',
	},
];

export function ToggleTheme() {
	const { theme, setTheme } = useTheme();

	const [isMounted, setIsMounted] = React.useState(false);

	React.useEffect(() => {
		setIsMounted(true);
	}, []);

	if (!isMounted) {
		return <div className="flex h-8 w-24" />;
	}

	return (
		<motion.div
			key={String(isMounted)}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3 }}
			className="bg-muted/80 inline-flex items-center overflow-hidden rounded-md border"
			role="radiogroup"
		>
			{THEME_OPTIONS.map((option) => (
				<button
					key={option.value}
					className={cn(
						'relative flex size-7 cursor-pointer items-center justify-center rounded-md transition-all',
						theme === option.value
							? 'text-foreground'
							: 'text-muted-foreground hover:text-foreground',
					)}
					role="radio"
					aria-checked={theme === option.value}
					aria-label={`Switch to ${option.value} theme`}
					onClick={() => setTheme(option.value)}
				>
					{theme === option.value && (
						<motion.div
							layoutId="theme-option"
							transition={{ type: 'spring', bounce: 0.1, duration: 0.75 }}
							className="border-muted-foreground/50 absolute inset-0 rounded-md border"
						/>
					)}
					<option.icon className="size-3.5" />
				</button>
			))}
		</motion.div>
	);
}
