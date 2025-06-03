const Footer = () => {
    return (
        <div className="p-6 pt-0 mt-auto text-center dark:text-white-dark ltr:sm:text-left rtl:sm:text-right">
            © {new Date().getFullYear()}. Digital Gyani Saarthi. All rights reserved. 
            <span> | </span>
            <a href="/privacy-policy" className="text-blue-500 hover:underline">Privacy Policy</a>
            <span> | </span>
            <a href="/terms-condition" className="text-blue-500 hover:underline">Terms & Conditions</a>
            <span> | </span>
            <a href="/contact-us" className="text-blue-500 hover:underline">Contact Us</a>
        </div>
    );
};

export default Footer;
