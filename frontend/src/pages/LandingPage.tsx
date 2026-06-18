import { useEffect } from 'react';
import { Hero } from '../components/landing/Hero';
import { ProblemStatement } from '../components/landing/ProblemStatement';
import { HowItWorks } from '../components/landing/HowItWorks';
import { RoleCapabilities } from '../components/landing/RoleCapabilities';
import { Features } from '../components/landing/Features';
import { Security } from '../components/landing/Security';
import { GettingStarted } from '../components/landing/GettingStarted';
import { Footer } from '../components/landing/Footer';

const LandingPage = () => {
    // Ensure we start at the top when mounting
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
            <Hero />
            <ProblemStatement />
            <HowItWorks />
            <RoleCapabilities />
            <Features />
            <Security />
            <GettingStarted />
            <Footer />
        </div>
    );
};

export default LandingPage;
