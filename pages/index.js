import Head from "next/head";
//import styles from "../styles/Home.module.css";
import Link from "next/link";
import Layout from "../components/layout";
import Leaderboard from "../components/Leaderboard";
import TokenGrid from "../components/TokenGrid";
import Iron from "@hapi/iron";
import CookieService from "../lib/cookie";

export async function getServerSideProps(context) {
  //Get user from encrypted cookie
  const getUserFromContext = async (context) => {
    let user = null;
    let cookieDict;
    try {
      if (context.req.headers.cookie) {
        cookieDict = context.req.headers.cookie
          .split("; ")
          .reduce((prev, current) => {
            const [name, value] = current.split("=");
            prev[name] = value;
            return prev;
          }, {});

        if (cookieDict.api_token) {
          user = await Iron.unseal(
            CookieService.getAuthToken(cookieDict),
            process.env.ENCRYPTION_SECRET,
            Iron.defaults
          );
        }
      }
    } catch (error) {}

    return user;
  };
  const user = await getUserFromContext(context);

  const res_featured = await fetch(`${process.env.BACKEND_URL}/v1/featured`);
  const data_featured = await res_featured.json();

  const res_leaderboard = await fetch(
    `${process.env.BACKEND_URL}/v1/leaderboard`
  );
  const data_leaderboard = await res_leaderboard.json();

  return {
    props: {
      user: user,
      featured_items: data_featured.data,
      leaderboard: data_leaderboard.data,
    }, // will be passed to the page component as props
  };
}

export default function Home({ featured_items, leaderboard, user }) {
  return (
    <Layout user={user}>
      <Head>
        <title>Digital Art</title>
      </Head>
      <h1
        className="showtime-title text-center mx-auto"
        style={{ maxWidth: 1000 }}
      >
        Discover and showcase your favorite digital art
      </h1>
      <>
        <div className="flex justify-center">
          {user ? (
            <Link href="/profile">
              <a className="showtime-pink-button-outline">Go to My Profile</a>
            </Link>
          ) : (
            <button className="showtime-pink-button">
              Continue with Email
            </button>
          )}
        </div>
      </>
      <TokenGrid items={featured_items} />
      <Leaderboard topCreators={leaderboard} />

      {/*<Link href="/login">
        <a>Login</a>
      </Link>
  <h1>Welcome to Showtime!</h1>*/}
    </Layout>
  );
}
