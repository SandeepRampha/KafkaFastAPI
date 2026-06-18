
import Heart from 'lucide-react/dist/esm/icons/heart';

export const Footer = () => {
    return (
        <footer className="py-8 bg-background border-t border-border">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-muted-foreground text-sm">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <div className="font-bold text-foreground">Kafka Manager</div>
                    <span className="hidden md:inline text-border">|</span>
                    <span>v1.0.0</span>
                </div>

                <div className="flex items-center gap-2">
                    <span>Built by Alephys Technologies Private Limited</span>
                    <Heart className="w-3 h-3 text-red-500 fill-current" />
                </div>

                <div className="mt-4 md:mt-0">
                    <a href="#" className="hover:text-primary transition-colors">#kafka-manager-support</a>
                </div>
            </div>
        </footer>
    );
};
