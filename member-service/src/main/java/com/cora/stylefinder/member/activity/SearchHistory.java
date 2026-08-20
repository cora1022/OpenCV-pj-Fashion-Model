package com.cora.stylefinder.member.activity;
import com.cora.stylefinder.member.member.User; import jakarta.persistence.*; import java.time.Instant;
@Entity @Table(name="search_histories") public class SearchHistory { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="user_id") User user; String searchType; String cropMode; Instant searchedAt; protected SearchHistory(){} public SearchHistory(User u,String t,String c){user=u;searchType=t;cropMode=c;searchedAt=Instant.now();} public Long getId(){return id;} }
