import CallToAction from "../../components/common/CallToAction";
import CategoriesSection from "../../components/common/CategoriesSection";
import FeaturedProviders from "../../components/common/FeaturedProviders";
import HeroSection from "../../components/common/HeroSection";
import HowItWorks from "../../components/common/HowItWorks";
import SearchSection from "../../components/common/SearchSection";
import Testimonials from "../../components/common/Testimonials";
import WhyChooseUs from "../../components/common/WhyChooseUs";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function Home() {
  const navigate = useNavigate();

  const [city, setCity] = useState("");

  const [skill, setSkill] = useState("");

  const [providers, setProviders] = useState([]);
  return (
    <>
      <HeroSection />
      <SearchSection
        city={city}
        setCity={setCity}
        skill={skill}
        setSkill={setSkill}
        setProviders={setProviders}
      />
      <CategoriesSection />
      <HowItWorks />
      <FeaturedProviders providers={providers} />
      <WhyChooseUs />
      <Testimonials />
      <CallToAction />
    </>
  );
}

export default Home;
