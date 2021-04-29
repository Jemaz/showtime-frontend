import { useState, useEffect, useContext, useRef, Fragment } from "react";
import Head from "next/head";
import _ from "lodash";
import mixpanel from "mixpanel-browser";
import Layout from "../components/layout";
import CappedWidth from "../components/CappedWidth";
import TokenGridV4 from "../components/TokenGridV4";
import backend from "../lib/backend";
import AppContext from "../context/app-context";
import ModalEditProfile from "../components/ModalEditProfile";
import ModalEditPhoto from "../components/ModalEditPhoto";
import ModalEditCover from "../components/ModalEditCover";
import ModalUserList from "../components/ModalUserList";
import ModalAddWallet from "../components/ModalAddWallet";
import ModalAddEmail from "../components/ModalAddEmail.js";
import {
  formatAddressShort,
  truncateWithEllipses,
  classNames,
} from "../lib/utilities";
import AddressButton from "../components/AddressButton";
import { SORT_FIELDS } from "../lib/constants";
import SpotlightItem from "../components/SpotlightItem";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faImage } from "@fortawesome/free-regular-svg-icons";
import ProfileFollowersPill from "../components/ProfileFollowersPill";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, SelectorIcon } from "@heroicons/react/solid";
import {
  faHeart as fasHeart,
  faFingerprint,
  faImage as fasImage,
  faEdit,
} from "@fortawesome/free-solid-svg-icons";

export async function getServerSideProps(context) {
  const { res, query } = context;

  const slug_address = query.profile;

  if (slug_address.includes("apple-touch-icon")) {
    res.writeHead(404);
    res.end();
    return { props: {} };
  }

  // Get profile metadata
  let response_profile;
  try {
    response_profile = await backend.get(`/v2/profile_server/${slug_address}`);
    const {
      profile,
      followers: followers_list,
      followers_count,
      following: following_list,
      following_count,
      featured_nft,
      lists,
    } = response_profile.data.data;

    return {
      props: {
        profile,
        slug_address,
        followers_list,
        followers_count,
        following_list,
        following_count,
        featured_nft,
        lists,
      },
    };
  } catch (err) {
    if (err.response.status == 400) {
      // Redirect to homepage
      res.writeHead(302, { location: "/" });
      res.end();
      return { props: {} };
    } else {
      res.writeHead(404);
      res.end();
      return { props: {} };
    }
  }
}

const Profile = ({
  profile,
  slug_address,
  followers_list,
  followers_count,
  following_list,
  following_count,
  featured_nft,
  lists,
}) => {
  const {
    name,
    img_url,
    cover_url,
    wallet_addresses,
    wallet_addresses_excluding_email,
    bio,
    website_url,
    profile_id,
    username,
    featured_nft_img_url,
    links,
  } = profile;

  const context = useContext(AppContext);

  // Profile details
  const [isMyProfile, setIsMyProfile] = useState();
  const [hasEmailAddress, setHasEmailAddress] = useState(false);
  const initialBioLength = context.isMobile ? 130 : 150;
  const [moreBioShown, setMoreBioShown] = useState(false);
  const [followersCount, setFollowersCount] = useState(followers_count);
  const profileToDisplay = isMyProfile
    ? context.myProfile
    : {
        name,
        website_url,
        bio,
        img_url,
        cover_url,
        username,
        links: links.map((link) => ({
          name: link.type__name,
          prefix: link.type__prefix,
          icon_url: link.type__icon_url,
          type_id: link.type_id,
          user_input: link.user_input,
        })),
        wallet_addresses_excluding_email,
      };
  useEffect(() => {
    // Wait for identity to resolve before recording the view
    if (typeof context.user !== "undefined") {
      if (context.user) {
        // Logged in?
        if (
          context.myProfile?.wallet_addresses
            .map((a) => a.toLowerCase())
            .includes(slug_address.toLowerCase()) ||
          slug_address.toLowerCase() ===
            context.myProfile?.username?.toLowerCase()
        ) {
          setIsMyProfile(true);
          if (
            wallet_addresses.length === wallet_addresses_excluding_email.length
          ) {
            setHasEmailAddress(false);
          } else {
            setHasEmailAddress(true);
          }
          mixpanel.track("Self profile view", { slug: slug_address });
        } else {
          setIsMyProfile(false);
          mixpanel.track("Profile view", { slug: slug_address });
        }
      } else {
        // Logged out
        setIsMyProfile(false);
        mixpanel.track("Profile view", { slug: slug_address });
      }
    }
  }, [
    profile_id,
    typeof context.user,
    context.myProfile,
    context.user ? context.user.publicAddress : null,
    slug_address,
  ]);

  // Followers
  const [followers, setFollowers] = useState([]);
  useEffect(() => {
    setFollowers(followers_list);
  }, [followers_list]);

  const [following, setFollowing] = useState([]);
  useEffect(() => {
    setFollowing(following_list);
  }, [following_list]);

  // Followed?
  const [isFollowed, setIsFollowed] = useState(false);
  useEffect(() => {
    if (context.myFollows) {
      setIsFollowed(
        context.myFollows.map((p) => p.profile_id).includes(profile_id)
      );
    }
  }, [context.myFollows, profile_id]);

  // Follow back?
  const [followingMe, setFollowingMe] = useState(false);
  useEffect(() => {
    if (
      following_list
        .map((item) => item.profile_id)
        .includes(context.myProfile?.profile_id)
    ) {
      setFollowingMe(true);
    } else {
      setFollowingMe(false);
    }
  }, [following_list, context.myProfile?.profile_id]);

  // Spotlight
  const [spotlightItem, setSpotlightItem] = useState();
  const handleChangeSpotlightItem = async (nft) => {
    const nftId = nft ? nft.nft_id : null;
    setSpotlightItem(nft);

    // Post changes to the API
    await fetch("/api/updatespotlight", {
      method: "post",
      body: JSON.stringify({
        nft_id: nftId,
      }),
    });
  };

  // NFT grid
  // Left menu
  const [menuLists, setMenuLists] = useState(lists.lists);

  // Grid
  const gridRef = useRef();
  const [selectedGrid, setSelectedGrid] = useState(1);
  const sortingOptionsList = [
    //{ label: "Select...", key: "" },
    ...Object.keys(SORT_FIELDS).map((key) => SORT_FIELDS[key]),
  ];

  const [items, setItems] = useState([]);
  const [collections, setCollections] = useState([]);
  const [collectionId, setCollectionId] = useState(0);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [isRefreshingCards, setIsRefreshingCards] = useState(false);
  const [selectedCreatedSortField, setSelectedCreatedSortField] = useState(
    lists.lists[0].sort_id || 1
  );
  const [selectedOwnedSortField, setSelectedOwnedSortField] = useState(
    lists.lists[1].sort_id || 1
  );
  const [selectedLikedSortField, setSelectedLikedSortField] = useState(2);

  const updateItems = async (listId, sortId, collectionId, showCardRefresh) => {
    if (showCardRefresh) {
      setIsRefreshingCards(true);
    }

    // Created
    const result = await fetch(`/api/getprofilenfts`, {
      method: "post",
      body: JSON.stringify({
        profileId: profile_id,
        page: 1,
        limit: 9,
        listId: listId,
        sortId: sortId,
        showHidden: 0,
        collectionId: collectionId,
      }),
    });
    const { data } = await result.json();
    setItems(data.items);

    if (showCardRefresh) {
      setIsRefreshingCards(false);
    }
  };

  const handleSortChange = (sortId) => {
    const setSelectedSortField =
      selectedGrid === 1
        ? setSelectedCreatedSortField
        : selectedGrid === 2
        ? setSelectedOwnedSortField
        : setSelectedLikedSortField;

    setSelectedSortField(sortId);
    updateItems(selectedGrid, sortId, collectionId, true);
  };

  const handleListChange = (listId) => {
    setSelectedGrid(listId);
    setCollectionId(0);

    const sortId =
      listId === 1
        ? selectedCreatedSortField
        : listId === 2
        ? selectedOwnedSortField
        : selectedLikedSortField;
    updateItems(listId, sortId, 0, true);
  };

  const handleCollectionChange = (collectionId) => {
    setCollectionId(collectionId);

    const sortId =
      selectedGrid === 1
        ? selectedCreatedSortField
        : selectedGrid === 2
        ? selectedOwnedSortField
        : selectedLikedSortField;
    updateItems(selectedGrid, sortId, collectionId, true);
  };

  // Fetch the created/owned/liked items
  const fetchItems = async (initial_load, lists) => {
    // clear out existing from page (if switching profiles)
    if (initial_load) {
      setMoreBioShown(false);
      setIsLoadingCards(true);

      setSpotlightItem(featured_nft);

      setSelectedCreatedSortField(lists.lists[0].sort_id || 1);
      setSelectedOwnedSortField(lists.lists[1].sort_id || 1);
      setSelectedLikedSortField(2);

      setCollectionId(0);
      setMenuLists([]);
      setItems([]);
      setCollections([]);
    }

    // Populate initial state
    if (lists.default_list_id == 1) {
      // Created
      const result = await fetch(`/api/getprofilenfts`, {
        method: "post",
        body: JSON.stringify({
          profileId: profile_id,
          page: 1,
          limit: 9,
          listId: 1,
          sortId: lists.lists[0].sort_id,
          showHidden: 0,
          collectionId: 0,
        }),
      });
      const { data } = await result.json();
      setItems(data.items);
    } else if (lists.default_list_id == 2) {
      // Owned
      const result = await fetch(`/api/getprofilenfts`, {
        method: "post",
        body: JSON.stringify({
          profileId: profile_id,
          page: 1,
          limit: 9,
          listId: 2,
          sortId: lists.lists[1].sort_id,
          showHidden: 0,
          collectionId: 0,
        }),
      });
      const { data } = await result.json();
      setItems(data.items);
    } else if (lists.default_list_id == 3) {
      // Liked
      const result = await fetch(`/api/getprofilenfts`, {
        method: "post",
        body: JSON.stringify({
          profileId: profile_id,
          page: 1,
          limit: 9,
          listId: 3,
          sortId: lists.lists[2].sort_id,
          showHidden: 0,
          collectionId: 0,
        }),
      });
      const { data } = await result.json();
      setItems(data.items);
    }

    if (initial_load) {
      setIsLoadingCards(false);
    }
  };

  useEffect(() => {
    fetchItems(true, lists);
  }, [profile_id, lists]);

  const handleLoggedOutFollow = () => {
    mixpanel.track("Follow but logged out");
    context.setLoginModalOpen(true);
  };

  const handleFollow = async () => {
    setIsFollowed(true);
    setFollowersCount(followersCount + 1);
    // Change myFollows via setMyFollows
    context.setMyFollows([
      {
        profile_id: profile_id,
        wallet_address: wallet_addresses[0],
        name: name,
        img_url: img_url
          ? img_url
          : "https://storage.googleapis.com/opensea-static/opensea-profile/4.png",
        timestamp: null,
        username: username,
      },
      ...context.myFollows,
    ]);

    setFollowers([
      {
        profile_id: context.myProfile.profile_id,
        wallet_address: context.user.publicAddress,
        name: context.myProfile.name,
        img_url: context.myProfile.img_url
          ? context.myProfile.img_url
          : "https://storage.googleapis.com/opensea-static/opensea-profile/4.png",
        timestamp: null,
        username: context.myProfile.username,
      },
      ...followers,
    ]);

    // Post changes to the API
    await fetch(`/api/follow_v2/${profile_id}`, {
      method: "post",
    });

    mixpanel.track("Followed profile");
  };

  const handleUnfollow = async () => {
    setIsFollowed(false);
    setFollowersCount(followersCount - 1);
    // Change myLikes via setMyLikes
    context.setMyFollows(
      context.myFollows.filter((item) => item.profile_id != profile_id)
    );

    setFollowers(
      followers.filter((follower) => {
        return context.myProfile.profile_id != follower.profile_id;
      })
    );

    // Post changes to the API
    await fetch(`/api/unfollow_v2/${profile_id}`, {
      method: "post",
    });

    mixpanel.track("Unfollowed profile");
  };

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [pictureModalOpen, setPictureModalOpen] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [openCardMenu, setOpenCardMenu] = useState(null);

  /*
  const updateCreated = async (selectedCreatedSortField, showCardRefresh) => {
    if (showCardRefresh) {
      setIsRefreshingCards(true);
    }

    const response_profile = await backend.get(
      `/v2/profile_client/${slug_address}?limit=150&tab=created&sort=${selectedCreatedSortField}`
    );
    const data_profile = response_profile.data.data;

    setCreatedItems(
      data_profile.created.filter(
        (item) =>
          item.token_hidden !== 1 &&
          (item.token_img_url || item.token_animation_url)
      )
    );
    if (showCardRefresh) {
      setIsRefreshingCards(false);
    }
  };

  const updateOwned = async (selectedOwnedSortField, showCardRefresh) => {
    if (showCardRefresh) {
      setIsRefreshingCards(true);
    }

    const response_profile = await backend.get(
      `/v2/profile_client/${slug_address}?limit=150&tab=owned&sort=${selectedOwnedSortField}`
    );
    const data_profile = response_profile.data.data;

    setOwnedItems(
      data_profile.owned.filter(
        (item) =>
          item.token_hidden !== 1 &&
          (item.token_img_url || item.token_animation_url)
      )
    );
    if (showCardRefresh) {
      setIsRefreshingCards(false);
    }
  };
  */

  const [showUserHiddenItems, setShowUserHiddenItems] = useState(false);

  useEffect(() => {
    setSelectedGrid(lists.default_list_id);
    setMenuLists(lists.lists);

    setShowFollowers(false);
    setShowFollowing(false);
  }, [profile_id, lists.default_list_id, isLoadingCards]);

  // profilePill Edit profile actions
  const editAccount = () => {
    setEditModalOpen(true);
    mixpanel.track("Open edit name");
  };

  const editPhoto = () => {
    setPictureModalOpen(true);
    mixpanel.track("Open edit photo");
  };

  const addWallet = () => {
    setWalletModalOpen(true);
    mixpanel.track("Open add wallet");
  };

  const addEmail = () => {
    setEmailModalOpen(true);
    mixpanel.track("Open add email");
  };

  const logout = async () => {
    await context.logOut();
    setIsMyProfile(false);
  };

  return (
    <div
      onClick={() => {
        setOpenCardMenu(null);
      }}
    >
      {typeof document !== "undefined" ? (
        <>
          <ModalAddWallet
            isOpen={walletModalOpen}
            setWalletModalOpen={setWalletModalOpen}
            walletAddresses={wallet_addresses}
          />
          <ModalAddEmail
            isOpen={emailModalOpen}
            setEmailModalOpen={setEmailModalOpen}
            walletAddresses={wallet_addresses}
            setHasEmailAddress={setHasEmailAddress}
          />
          {editModalOpen && (
            <ModalEditProfile
              isOpen={editModalOpen}
              setEditModalOpen={setEditModalOpen}
            />
          )}
          <ModalEditPhoto
            isOpen={pictureModalOpen}
            setEditModalOpen={setPictureModalOpen}
          />
          <ModalEditCover
            isOpen={coverModalOpen}
            setEditModalOpen={setCoverModalOpen}
          />
          {/* Followers modal */}
          <ModalUserList
            title="Followers"
            isOpen={showFollowers}
            users={followers ? followers : []}
            closeModal={() => {
              setShowFollowers(false);
            }}
            emptyMessage="No followers yet."
          />
          {/* Following modal */}
          <ModalUserList
            title="Following"
            isOpen={showFollowing}
            users={following ? following : []}
            closeModal={() => {
              setShowFollowing(false);
            }}
            emptyMessage="Not following anyone yet."
          />
        </>
      ) : null}
      <Layout>
        <Head>
          <title>
            {profileToDisplay?.name ? profileToDisplay.name : "Unnamed"}
          </title>

          <meta
            name="description"
            content="Explore crypto art I've created, owned, and liked"
          />
          <meta property="og:type" content="website" />
          <meta
            name="og:description"
            content="Explore crypto art I've created, owned, and liked"
          />
          <meta
            property="og:image"
            content={
              featured_nft_img_url
                ? featured_nft_img_url
                : img_url
                ? img_url
                : "https://storage.googleapis.com/opensea-static/opensea-profile/4.png"
            }
          />
          <meta name="og:title" content={name ? name : wallet_addresses[0]} />

          <meta name="twitter:card" content="summary_large_image" />
          <meta
            name="twitter:title"
            content={name ? name : wallet_addresses[0]}
          />
          <meta
            name="twitter:description"
            content="Explore crypto art I've created, owned, and liked"
          />
          <meta
            name="twitter:image"
            content={
              featured_nft_img_url
                ? featured_nft_img_url
                : img_url
                ? img_url
                : "https://storage.googleapis.com/opensea-static/opensea-profile/4.png"
            }
          />
        </Head>

        <div
          className="h-32 md:h-64 relative text-left bg-gradient-to-b from-black to-gray-800"
          style={
            profileToDisplay?.cover_url
              ? {
                  backgroundImage: `url(${profileToDisplay.cover_url})`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center center",
                  backgroundSize: "cover",
                }
              : {}
          }
        >
          {isMyProfile && (
            <CappedWidth>
              <div className="relative">
                <div
                  className="absolute top-6 right-5  2xl:right-5 text-gray-200 text-sm cursor-pointer bg-gray-800 bg-opacity-70 py-1 px-3 rounded-full hover:bg-opacity-90"
                  onClick={() => {
                    if (isMyProfile) {
                      setCoverModalOpen(true);
                      mixpanel.track("Open edit cover photo");
                    }
                  }}
                >
                  <FontAwesomeIcon icon={faEdit} /> Cover
                </div>
              </div>
            </CappedWidth>
          )}
        </div>

        <CappedWidth>
          <div className="flex flex-col md:flex-row mx-5">
            <div className="flex flex-col text-left">
              <div className="z-10 pb-2 flex flex-row">
                <img
                  onClick={() => {
                    if (isMyProfile) {
                      setPictureModalOpen(true);
                      mixpanel.track("Open edit photo");
                    }
                  }}
                  src={
                    profileToDisplay?.img_url
                      ? profileToDisplay.img_url
                      : "https://storage.googleapis.com/opensea-static/opensea-profile/4.png"
                  }
                  className={`h-24 w-24 md:h-32 md:w-32 rounded-full border-2 shadow-md border-white z-10 -mt-14 md:-mt-20 overflow-hidden ${
                    isMyProfile ? "cursor-pointer " : ""
                  }`}
                />
                <div className="flex-grow"></div>
                <div className="md:hidden z-10 -mt-5">
                  <ProfileFollowersPill
                    following={following}
                    followers={followers}
                    isFollowed={isFollowed}
                    isMyProfile={isMyProfile}
                    followingMe={followingMe}
                    handleUnfollow={handleUnfollow}
                    handleFollow={handleFollow}
                    handleLoggedOutFollow={handleLoggedOutFollow}
                    hasEmailAddress={hasEmailAddress}
                    setShowFollowers={setShowFollowers}
                    setShowFollowing={setShowFollowing}
                    editAccount={editAccount}
                    editPhoto={editPhoto}
                    addWallet={addWallet}
                    addEmail={addEmail}
                    logout={logout}
                  />
                </div>
              </div>
              <div className="text-3xl md:text-4xl md:mb-1">
                {" "}
                {profileToDisplay?.name
                  ? profileToDisplay.name
                  : wallet_addresses_excluding_email &&
                    wallet_addresses_excluding_email.length > 0
                  ? formatAddressShort(wallet_addresses_excluding_email[0])
                  : "Unnamed"}
              </div>
              <div>
                {(username || wallet_addresses_excluding_email.length > 0) && (
                  <div className="flex flex-row items-center justify-start">
                    {username && (
                      <div className="md:mr-2 text-sm md:text-base text-gray-500">
                        @{username}
                      </div>
                    )}

                    <div className="flex ml-1">
                      {wallet_addresses_excluding_email.map((address) => {
                        return (
                          <AddressButton key={address} address={address} />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div>
                {profileToDisplay?.bio ? (
                  // <div className="text-gray-500 flex flex-row">
                  //   <div className="max-w-prose text-sm sm:text-base">
                  //     {context.myProfile.bio}
                  //   </div>
                  // </div>
                  <div
                    style={{
                      overflowWrap: "break-word",
                      wordWrap: "break-word",
                      display: "block",
                    }}
                    className="text-black text-sm max-w-prose text-left md:text-base mt-6"
                  >
                    {moreBioShown
                      ? profileToDisplay.bio
                      : truncateWithEllipses(
                          profileToDisplay.bio,
                          initialBioLength
                        )}
                    {!moreBioShown &&
                      profileToDisplay?.bio &&
                      profileToDisplay.bio.length > initialBioLength && (
                        <a
                          onClick={() => setMoreBioShown(true)}
                          className="text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                          {" "}
                          more
                        </a>
                      )}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex-grow"></div>
            <div className="flex  flex-col">
              <div className="flex items-center mt-6 md:-mt-7 md:z-10  md:justify-end justify-start md:mx-0 ">
                <div className="flex flex-row  md:bg-white md:shadow-md md:rounded-full md:px-2 md:py-2 items-center">
                  <div className="flex-grow ">
                    <div className="flex flex-row ">
                      <div
                        className="flex-1 flex flex-row items-center cursor-pointer hover:opacity-80 md:ml-4"
                        onClick={() => {
                          setShowFollowing(true);
                        }}
                      >
                        <div className="text-sm mr-2">
                          {following && following.length !== null
                            ? Number(
                                isMyProfile
                                  ? context.myFollows.length
                                  : following_count
                              ).toLocaleString()
                            : null}
                        </div>
                        <div className="text-sm text-gray-500 mr-5">
                          Following
                        </div>
                      </div>
                      <div
                        className="flex-1 flex flex-row items-center cursor-pointer hover:opacity-80 "
                        onClick={() => {
                          setShowFollowers(true);
                        }}
                      >
                        <div className="text-sm  mr-2">
                          {followers && followers.length !== null
                            ? Number(followersCount).toLocaleString()
                            : null}
                        </div>
                        <div className="text-sm text-gray-500 mr-5">
                          Followers
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:flex">
                    <ProfileFollowersPill
                      following={following}
                      followers={followers}
                      isFollowed={isFollowed}
                      isMyProfile={isMyProfile}
                      followingMe={followingMe}
                      handleUnfollow={handleUnfollow}
                      handleFollow={handleFollow}
                      handleLoggedOutFollow={handleLoggedOutFollow}
                      hasEmailAddress={hasEmailAddress}
                      setShowFollowers={setShowFollowers}
                      setShowFollowing={setShowFollowing}
                      editAccount={editAccount}
                      editPhoto={editPhoto}
                      addWallet={addWallet}
                      addEmail={addEmail}
                      logout={logout}
                    />
                  </div>
                </div>
              </div>

              <div className=" md:text-right text-sm md:mr-2 pt-5 md:pt-7">
                {profileToDisplay?.website_url ? (
                  <a
                    href={
                      profileToDisplay.website_url.slice(0, 4) === "http"
                        ? profileToDisplay.website_url
                        : "https://" + profileToDisplay.website_url
                    }
                    target="_blank"
                    onClick={() => {
                      mixpanel.track("Clicked profile website link", {
                        slug: slug_address,
                      });
                    }}
                    className="inline-block "
                  >
                    <div className="flex text-gray-500 flex-row  items-center hover:opacity-80 mr-3 md:mr-0">
                      <img
                        src="/icons/link-solid-01.png"
                        alt=""
                        className="flex-shrink-0 h-5 w-5 mr-1 opacity-70"
                      />
                      <div>
                        <div style={{ wordBreak: "break-all" }}>
                          {profileToDisplay.website_url}
                        </div>
                      </div>
                    </div>
                  </a>
                ) : null}
                {/* map out social links */}
                {profileToDisplay?.links &&
                  profileToDisplay.links.map((socialLink) => (
                    <a
                      href={
                        `https://${socialLink.prefix}` + socialLink.user_input
                      }
                      target="_blank"
                      onClick={() => {
                        mixpanel.track(
                          `Clicked ${socialLink.name} profile link`,
                          {
                            slug: slug_address,
                          }
                        );
                      }}
                      className="mr-4 md:mr-0 md:ml-5 inline-block "
                      key={socialLink.type_id}
                    >
                      <div className="text-gray-500 flex flex-row items-center hover:opacity-80">
                        {socialLink.icon_url && (
                          <img
                            src={socialLink.icon_url}
                            alt=""
                            className="flex-shrink-0 h-5 w-5 mr-1 opacity-70"
                          />
                        )}
                        <div>
                          <div className="" style={{ wordBreak: "break-all" }}>
                            {socialLink.name}
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
              </div>
              <div className="flex-grow "></div>
            </div>
          </div>
        </CappedWidth>

        {spotlightItem ? (
          <div className="mt-12 sm:mt-8 md:mt-12">
            <div className="relative bg-white border-t border-b border-gray-200 sm:py-16 sm:pb-8 md:pb-16 mb-4">
              <SpotlightItem
                item={spotlightItem}
                removeSpotlightItem={() => {
                  handleChangeSpotlightItem(null);
                  mixpanel.track("Removed Spotlight Item");
                }}
                isMyProfile={isMyProfile}
                openCardMenu={openCardMenu}
                setOpenCardMenu={setOpenCardMenu}
                listId={0}
                refreshItems={() => {
                  updateCreated(selectedCreatedSortField, false);
                  updateOwned(selectedOwnedSortField, false);
                }}
                key={spotlightItem.nft_id}
                pageProfile={{
                  profile_id,
                  slug_address,
                  name,
                  img_url,
                  wallet_addresses_excluding_email,
                  slug_address,
                  website_url,
                  profile_id,
                  username,
                }}
              />
            </div>
          </div>
        ) : null}
        <CappedWidth>
          <div className="m-auto">
            <div
              ref={gridRef}
              className="grid lg:grid-cols-3 xl:grid-cols-4 pt-0 "
            >
              <div className="sm:px-3">
                <div className="h-max sticky top-24  ">
                  <div className="px-2 sm:px-4 py-2 sm:py-4 sm:rounded-lg bg-white border-t border-b sm:border-none border-gray-200  sm:shadow-md mt-16">
                    <div className="border-b border-gray-200 sm:mx-2 mb-2 pb-4  ">
                      <div className="flex flex-row items-center mt-2 ml-2 sm:mt-0 sm:ml-0">
                        <div className="mr-2">
                          <img
                            src={
                              profileToDisplay && profileToDisplay.img_url
                                ? profileToDisplay.img_url
                                : "https://storage.googleapis.com/opensea-static/opensea-profile/4.png"
                            }
                            style={{ width: 22, height: 22 }}
                            className="rounded-full"
                          />
                        </div>
                        <div>
                          {profileToDisplay?.name
                            ? profileToDisplay.name
                            : wallet_addresses_excluding_email &&
                              wallet_addresses_excluding_email.length > 0
                            ? formatAddressShort(
                                wallet_addresses_excluding_email[0]
                              )
                            : "Unnamed"}
                        </div>
                        <div className="flex-grow"></div>
                        {/*isMyProfile ? (
                          <div className="flex sm:hidden">
                            <div className="flex-grow flex"></div>
                            <div
                              className=" text-xs mr-2 text-gray-400 cursor-pointer hover:text-gray-700"
                              onClick={() => {
                                setShowUserHiddenItems(!showUserHiddenItems);
                              }}
                            >
                              {createdHiddenItems.length === 0 &&
                              ownedHiddenItems.length === 0 &&
                              likedHiddenItems.length === 0
                                ? null
                                : showUserHiddenItems
                                ? "Hide hidden"
                                : "Show hidden"}
                            </div>
                          </div>
                              ) : null*/}
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col">
                      <div
                        onClick={() => {
                          //setSelectedGrid(1);
                          handleListChange(1);
                          if (
                            gridRef?.current?.getBoundingClientRect().top < 0
                          ) {
                            window.scroll({
                              top: gridRef?.current?.offsetTop + 30,
                              behavior: "smooth",
                            });
                          }
                        }}
                        className={`flex-1 hover:bg-stpurple100 p-2 sm:mb-1 ml-1 sm:ml-0 rounded-lg px-3  ${
                          selectedGrid === 1
                            ? "text-stpurple700 bg-stpurple100"
                            : "text-gray-500"
                        } hover:text-stpurple700 cursor-pointer flex flex-row transition-all items-center`}
                      >
                        <div className="w-6 hidden sm:block">
                          <FontAwesomeIcon
                            icon={faFingerprint}
                            className="mr-2"
                          />
                        </div>
                        <div className="flex-grow sm:hidden"></div>
                        <div className="sm:hidden mr-1">
                          {menuLists ? menuLists[0].count : null}
                        </div>
                        <div>Created</div>
                        <div className="flex-grow"></div>
                        <div className="rounded-full text-center text-sm hidden sm:block">
                          {menuLists ? menuLists[0].count : null}
                          <span className="invisible">+</span>
                        </div>
                      </div>
                      <div
                        onClick={() => {
                          //setSelectedGrid(2);
                          handleListChange(2);
                          if (
                            gridRef?.current?.getBoundingClientRect().top < 0
                          ) {
                            window.scroll({
                              top: gridRef?.current?.offsetTop + 30,
                              behavior: "smooth",
                            });
                          }
                        }}
                        className={`flex-1 hover:bg-stteal100 sm:mb-1 p-2  rounded-lg px-3 ${
                          selectedGrid === 2
                            ? "text-stteal700 bg-stteal100"
                            : "text-gray-500"
                        } hover:text-stteal700 cursor-pointer flex flex-row transition-all items-center`}
                      >
                        <div className="w-6 hidden sm:block">
                          <FontAwesomeIcon
                            icon={selectedGrid === 2 ? fasImage : faImage}
                            className="mr-2"
                          />
                        </div>
                        <div className="flex-grow sm:hidden"></div>
                        <div className="sm:hidden mr-1">
                          {menuLists ? menuLists[1].count : null}
                        </div>
                        <div>Owned</div>
                        <div className="flex-grow"></div>
                        <div className="rounded-full text-center text-sm hidden sm:block">
                          {menuLists ? menuLists[1].count : null}
                          <span className="invisible">+</span>
                        </div>
                      </div>
                      <div
                        onClick={() => {
                          //setSelectedGrid(3);
                          handleListChange(3);
                          if (
                            gridRef?.current?.getBoundingClientRect().top < 0
                          ) {
                            window.scroll({
                              top: gridRef?.current?.offsetTop + 30,
                              behavior: "smooth",
                            });
                          }
                        }}
                        className={`flex-1 hover:bg-stred100 p-2 sm:mt-0 mr-1 sm:mr-0 rounded-lg px-3 ${
                          selectedGrid === 3
                            ? "text-stred bg-stred100"
                            : "text-gray-500"
                        } hover:text-stred cursor-pointer flex flex-row transition-all items-center`}
                      >
                        <div className="w-6 hidden sm:block">
                          <FontAwesomeIcon
                            icon={selectedGrid === 3 ? fasHeart : faHeart}
                            className="mr-2"
                          />
                        </div>
                        <div className="flex-grow sm:hidden"></div>
                        <div className="sm:hidden mr-1">
                          {menuLists
                            ? menuLists[2].count > 150
                              ? 150
                              : menuLists[2].count
                            : null}
                          {menuLists && menuLists[2].count > 150 ? "+" : ""}
                        </div>
                        <div>Liked</div>
                        <div className="flex-grow"></div>
                        <div className="rounded-full text-center text-sm hidden sm:block">
                          {menuLists
                            ? menuLists[2].count > 150
                              ? 150
                              : menuLists[2].count
                            : null}
                          <span
                            className={
                              menuLists && menuLists[2].count > 150
                                ? "visible"
                                : "invisible"
                            }
                          >
                            +
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    {/*isMyProfile ? (
                      <div className="flex hidden sm:flex">
                        <div className="flex-grow flex"></div>
                        <div
                          className=" text-xs mt-3 ml-6 mr-1 text-gray-400 cursor-pointer hover:text-gray-700"
                          onClick={() => {
                            setShowUserHiddenItems(!showUserHiddenItems);
                          }}
                        >
                          {createdHiddenItems.length === 0 &&
                          ownedHiddenItems.length === 0 &&
                          likedHiddenItems.length === 0
                            ? null
                            : showUserHiddenItems
                            ? "Hide hidden"
                            : "Show hidden"}
                        </div>
                      </div>
                          ) : null*/}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 xl:col-span-3 min-h-screen ">
                {!isLoadingCards && (
                  <div
                    className={`sm:mt-0 flex h-12 items-center px-3 my-2  md:text-base ${
                      null

                      /*selectedGrid === 3
                        ? "invisible"
                        : selectedGrid === 1 &&
                          createdItems.filter(
                            //(item) => !createdHiddenItems.includes(item.nft_id)
                            true
                          ).length === 0
                        ? "invisible"
                        : selectedGrid === 2 &&
                          ownedItems.filter(
                            //(item) => !ownedHiddenItems.includes(item.nft_id)
                            true
                          ).length === 0
                        ? "invisible"
                        : null
                            */
                    }`}
                  >
                    <div className="flex-1"></div>
                    <Listbox
                      value={collectionId}
                      onChange={(value) => {
                        handleCollectionChange(value);
                      }}
                    >
                      {({ open }) => (
                        <>
                          <div className="relative mr-2" style={{ width: 218 }}>
                            <Listbox.Button className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                              <span className="flex items-center">
                                <>
                                  {collectionId && collectionId > 0 ? (
                                    <img
                                      src={
                                        menuLists &&
                                        menuLists[
                                          selectedGrid - 1
                                        ].collections.filter(
                                          (t) =>
                                            t.collection_id === collectionId
                                        ).length > 0 &&
                                        menuLists[
                                          selectedGrid - 1
                                        ].collections.filter(
                                          (t) =>
                                            t.collection_id === collectionId
                                        )[0].collection_img_url
                                          ? menuLists[
                                              selectedGrid - 1
                                            ].collections.filter(
                                              (t) =>
                                                t.collection_id === collectionId
                                            )[0].collection_img_url
                                          : "https://storage.googleapis.com/opensea-static/opensea-profile/4.png"
                                      }
                                      alt=""
                                      className="flex-shrink-0 h-6 w-6 rounded-full mr-3"
                                    />
                                  ) : null}
                                  <span className=" block truncate">
                                    {menuLists &&
                                      menuLists[
                                        selectedGrid - 1
                                      ].collections.filter(
                                        (t) => t.collection_id === collectionId
                                      ).length > 0 &&
                                      menuLists[
                                        selectedGrid - 1
                                      ].collections.filter(
                                        (t) => t.collection_id === collectionId
                                      )[0].collection_name}
                                  </span>
                                </>
                              </span>
                              <span className="ml-3 absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <SelectorIcon
                                  className="h-5 w-5 text-gray-400"
                                  aria-hidden="true"
                                />
                              </span>
                            </Listbox.Button>

                            <Transition
                              show={open}
                              as={Fragment}
                              leave="transition ease-in duration-100"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0"
                            >
                              <Listbox.Options
                                static
                                className="z-10 absolute mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
                              >
                                {menuLists &&
                                  menuLists[selectedGrid - 1].collections.map(
                                    (item) => (
                                      <Listbox.Option
                                        key={item.collection_id}
                                        className={({ active }) =>
                                          classNames(
                                            active
                                              ? "text-white bg-indigo-600"
                                              : "text-gray-900",
                                            "cursor-default select-none relative py-2 pl-3 pr-9"
                                          )
                                        }
                                        value={item.collection_id}
                                      >
                                        {({ active }) => (
                                          <>
                                            <div className="flex items-center">
                                              <img
                                                src={
                                                  item.collection_img_url
                                                    ? item.collection_img_url
                                                    : "https://storage.googleapis.com/opensea-static/opensea-profile/4.png"
                                                }
                                                alt=""
                                                className="flex-shrink-0 h-6 w-6 rounded-full"
                                              />
                                              <span
                                                className={classNames(
                                                  item.collection_id ===
                                                    collectionId
                                                    ? "font-normal" // "font-semibold"
                                                    : "font-normal",
                                                  "ml-3 block truncate"
                                                )}
                                              >
                                                {item.collection_name}
                                              </span>
                                            </div>

                                            {item.collection_id ===
                                            collectionId ? (
                                              <span
                                                className={classNames(
                                                  active
                                                    ? "text-white"
                                                    : "text-indigo-600",
                                                  "absolute inset-y-0 right-0 flex items-center pr-4"
                                                )}
                                              >
                                                <CheckIcon
                                                  className="h-5 w-5"
                                                  aria-hidden="true"
                                                />
                                              </span>
                                            ) : null}
                                          </>
                                        )}
                                      </Listbox.Option>
                                    )
                                  )}
                              </Listbox.Options>
                            </Transition>
                          </div>
                        </>
                      )}
                    </Listbox>

                    <Listbox
                      value={
                        selectedGrid === 1
                          ? selectedCreatedSortField
                          : selectedGrid === 2
                          ? selectedOwnedSortField
                          : selectedLikedSortField
                      }
                      onChange={(value) => {
                        handleSortChange(value);
                      }}
                    >
                      {({ open }) => (
                        <>
                          <Listbox.Label className="block text-sm text-gray-500 mr-2 hidden">
                            Sort By
                          </Listbox.Label>
                          <div className="relative" style={{ width: 130 }}>
                            <Listbox.Button className="bg-white relative w-full border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                              <span className="block truncate">
                                {
                                  sortingOptionsList.filter(
                                    (t) =>
                                      t.value ===
                                      (selectedGrid === 1
                                        ? selectedCreatedSortField
                                        : selectedGrid === 2
                                        ? selectedOwnedSortField
                                        : selectedLikedSortField)
                                  )[0].label
                                }
                              </span>
                              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <SelectorIcon
                                  className="h-5 w-5 text-gray-400"
                                  aria-hidden="true"
                                />
                              </span>
                            </Listbox.Button>

                            <Transition
                              show={open}
                              as={Fragment}
                              leave="transition ease-in duration-100"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0"
                            >
                              <Listbox.Options
                                static
                                className="z-10 absolute mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
                              >
                                {sortingOptionsList.map((item) => (
                                  <Listbox.Option
                                    key={item.value}
                                    className={({ active }) =>
                                      classNames(
                                        active
                                          ? "text-white bg-indigo-600"
                                          : "text-gray-900",
                                        "cursor-default select-none relative py-2 pl-3 pr-9"
                                      )
                                    }
                                    value={item.value}
                                  >
                                    {({ active }) => (
                                      <>
                                        <span
                                          className={classNames(
                                            item.value ===
                                              (selectedGrid === 1
                                                ? selectedCreatedSortField
                                                : selectedGrid === 2
                                                ? selectedOwnedSortField
                                                : selectedLikedSortField)
                                              ? "font-normal" // "font-semibold"
                                              : "font-normal",
                                            "block truncate"
                                          )}
                                        >
                                          {item.label}
                                        </span>

                                        {item.value ===
                                        (selectedGrid === 1
                                          ? selectedCreatedSortField
                                          : selectedGrid === 2
                                          ? selectedOwnedSortField
                                          : selectedLikedSortField) ? (
                                          <span
                                            className={classNames(
                                              active
                                                ? "text-white"
                                                : "text-indigo-600",
                                              "absolute inset-y-0 right-0 flex items-center pr-4"
                                            )}
                                          >
                                            <CheckIcon
                                              className="h-5 w-5"
                                              aria-hidden="true"
                                            />
                                          </span>
                                        ) : null}
                                      </>
                                    )}
                                  </Listbox.Option>
                                ))}
                              </Listbox.Options>
                            </Transition>
                          </div>
                        </>
                      )}
                    </Listbox>
                  </div>
                )}

                <TokenGridV4
                  key={`grid_${selectedGrid}_${profile_id}_${
                    isLoadingCards || isRefreshingCards
                  }`}
                  items={
                    items

                    /*selectedGrid === 1
                      ? createdItems
                      : selectedGrid === 2
                      ? ownedItems
                      : selectedGrid === 3
                      ? likedItems
                      : null*/
                  }
                  isLoading={isLoadingCards || isRefreshingCards}
                  listId={
                    selectedGrid

                    /*
                    selectedGrid === 1
                      ? 1
                      : selectedGrid === 2
                      ? 2
                      : selectedGrid === 3
                      ? 3
                      : null*/
                  }
                  isMyProfile={isMyProfile}
                  openCardMenu={openCardMenu}
                  setOpenCardMenu={setOpenCardMenu}
                  /*
                  userHiddenItems={
                    selectedGrid === 1
                      ? createdHiddenItems
                      : selectedGrid === 2
                      ? ownedHiddenItems
                      : selectedGrid === 3
                      ? likedHiddenItems
                      : null
                  }
                  setUserHiddenItems={
                    selectedGrid === 1
                      ? setCreatedHiddenItems
                      : selectedGrid === 2
                      ? setOwnedHiddenItems
                      : selectedGrid === 3
                      ? setLikedHiddenItems
                      : null
                  }
                  showUserHiddenItems={showUserHiddenItems}
                  */

                  refreshItems={
                    selectedGrid === 1
                      ? () => updateCreated(selectedCreatedSortField, false)
                      : () => updateOwned(selectedOwnedSortField, false)
                  }
                  detailsModalCloseOnKeyChange={slug_address}
                  changeSpotlightItem={handleChangeSpotlightItem}
                  pageProfile={{
                    profile_id,
                    slug_address,
                    name,
                    img_url,
                    wallet_addresses_excluding_email,
                    slug_address,
                    website_url,
                    profile_id,
                    username,
                  }} // to customize owned by list
                />
              </div>
            </div>
          </div>
          {/* End Page Body */}
        </CappedWidth>
      </Layout>
    </div>
  );
};

export default Profile;
