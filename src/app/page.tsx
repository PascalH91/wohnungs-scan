import { ProviderList } from "@/components/Providerlist";

import styles from "./page.module.css";

export default function Home() {
    return (
        <main className={styles.main}>
            <div className={styles.description}>
                <p>Wohnungs-Scanner</p>
            </div>
            <ProviderList />
        </main>
    );
}
