import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin , Github} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-blue-50 py-12 border-t mt-12">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <Link href="/" className="inline-block mb-4">
            <Image src="/logo-black.png" alt="Veylo" width={160} height={48} className="h-12 w-auto object-contain" />
          </Link>
          <p className="text-gray-600 text-sm">
            Veylo is an AI-powered vehicle marketplace helping you find the perfect car with smart search, verified listings, and seamless booking.
          </p>
        </div>

        <div>
          <h4 className="font-semibold mb-3 text-gray-800">Menu</h4>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li><Link href="/" className="hover:text-blue-700">Home</Link></li>
            <li><Link href="/cars" className="hover:text-blue-700">Cars</Link></li>
            <li><Link href="/about-us" className="hover:text-blue-700">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-blue-700">Contact</Link></li>
            <li><Link href="/admin" className="hover:text-blue-700">Admin</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-gray-800">Contact</h4>
          <ul className="space-y-2 text-gray-600 text-sm">
            <li className="flex items-center gap-2">
              <Mail size={16} /> <a href="mailto:info@veylo.com" className="hover:text-blue-700">info@veylo.com</a>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} /> <a href="tel:+91XXXXXXXXXX" className="hover:text-blue-700">+91 73095XXXXX</a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin size={16} /> 123 Street, Kanpur, India
            </li>
          </ul>
        </div>
        {/* Social */}
        <div>
          <h4 className="font-semibold mb-3 text-gray-800">Follow Us</h4>
          <div className="flex gap-4">
            <a href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook" className="text-gray-500 hover:text-blue-700">
              <Facebook size={22} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener" aria-label="Twitter" className="text-gray-500 hover:text-blue-700">
              <Twitter size={22} />
            </a>
            <a href="https://linkedin.com/in/i-atul" target="_blank" rel="noopener" aria-label="LinkedIn" className="text-gray-500 hover:text-blue-700">
              <Linkedin size={22} />
            </a>
            <a href="https://github.com/i-atul" target="_blank" rel="noopener" aria-label="LinkedIn" className="text-gray-500 hover:text-blue-700">
              <Github size={22} />
            </a>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-8 text-center text-gray-400 text-xs space-y-1">
        <div>© {new Date().getFullYear()} Veylo. All rights reserved.</div>
        <div>Developed by Atul</div>
      </div>
    </footer>
  );
}
