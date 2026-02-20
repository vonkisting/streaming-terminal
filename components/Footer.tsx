export default function Footer() {
  return (
    <footer className="sticky bottom-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-t border-slate-800/50 shadow-lg">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-slate-400 text-sm">
            © {new Date().getFullYear()} Streaming Terminal. All rights reserved.
          </div>
          <div className="flex items-center space-x-6 text-sm">
            <a href="#" className="text-slate-400 hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">
              Terms
            </a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
